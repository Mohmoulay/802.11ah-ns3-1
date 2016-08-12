function handleFiles(files) {
    getAsText(files[0]);
}
function getAsText(fileToRead) {
    var reader = new FileReader();
    // Read file into memory as UTF-8      
    reader.readAsText(fileToRead);
    // Handle errors load
    reader.onload = function (ev) {
        var csv = ev.target.result;
        processData(csv);
        fillDropdowns();
    };
    reader.onerror = function (ev) {
        alert("Unable to load csv file");
    };
}
var headers;
var lines;
function processData(csv) {
    var allTextLines = csv.split(/\r\n|\n/);
    lines = [];
    for (var i = 0; i < allTextLines.length; i++) {
        if (i == 0)
            headers = allTextLines[i].split(';');
        else {
            var parts = allTextLines[i].split(';');
            var obj = {};
            for (var j = 0; j < parts.length; j++) {
                if (/^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/.test(parts[j]))
                    obj[headers[j]] = parseFloat(parts[j]);
                else
                    obj[headers[j]] = parts[j];
            }
            lines.push(obj);
        }
    }
}
function fillDropdowns() {
    var ddls = $(".ddl");
    ddls.empty();
    for (var _i = 0, _a = headers.sort(); _i < _a.length; _i++) {
        var header = _a[_i];
        console.log(header);
        ddls.append($('<option></option>').val(header).html(header));
    }
    if (headers.indexOf("Name") != -1) {
        $("#ddlTag").val("Name");
    }
    dropdownChanged();
}
function dropdownChanged() {
    //  fill fixed remaining properties
    var otherProperties = [];
    var dynamicProperties = [$("#ddlXValues").val(), $("#ddlYValues").val(), $("#ddlSeries").val()];
    for (var _i = 0; _i < headers.length; _i++) {
        var h = headers[_i];
        var isDynamicProp = false;
        for (var _a = 0; _a < dynamicProperties.length; _a++) {
            var p = dynamicProperties[_a];
            if (h == p) {
                isDynamicProp = true;
                break;
            }
        }
        if (!isDynamicProp)
            otherProperties.push(h);
    }
    // try and save the fixed prop values
    var fixedPropState = {};
    var fixedProps = $(".ddlFixedProp");
    for (var i = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        fixedPropState[prop.attr("data-prop")] = prop.val();
    }
    $("#frmFixedValues").empty();
    if (otherProperties.length > 0) {
        for (var _b = 0, _c = otherProperties.sort(); _b < _c.length; _b++) {
            var h = _c[_b];
            $("#frmFixedValues").append("<div class=\"form-group\">\n                        <label for=\"ddlFixedProp" + h + "\" class=\"col-sm-3 control-label\">" + h + "</label>\n                        <div class=\"col-sm-9\">\n                            <select id=\"ddlFixedProp" + h + "\" class=\"form-control ddlFixedProp\" data-prop=\"" + h + "\"></select>\n                        </div>\n                    </div>");
            var ddl = $("#ddlFixedProp" + h);
            var values = getDistinctValuesFor(h);
            ddl.append($('<option></option>').val("").html("[Ignore]"));
            console.log(values);
            for (var _d = 0; _d < values.length; _d++) {
                var v = values[_d];
                ddl.append($('<option></option>').val(v).html(v));
            }
            if (values.length == 1)
                ddl.closest(".form-group").hide();
        }
        // restore if possible
        fixedProps = $(".ddlFixedProp");
        for (var i = 0; i < fixedProps.length; i++) {
            var prop = $($(fixedProps).get(i));
            if (typeof fixedPropState[prop.attr("data-prop")] != "undefined") {
                prop.val(fixedPropState[prop.attr("data-prop")]);
            }
        }
    }
    else
        $("#frmFixedValues").append("No fixed values");
}
function getDistinctValuesFor(header) {
    var distinctValues = {};
    for (var _i = 0; _i < lines.length; _i++) {
        var l = lines[_i];
        distinctValues[l[header]] = true;
    }
    var arr = [];
    for (var p in distinctValues) {
        if (p != "undefined" && distinctValues.hasOwnProperty(p)) {
            arr.push(p);
        }
    }
    return arr.sort();
}
var SeriesValues = (function () {
    function SeriesValues() {
        this.name = "";
        this.xValues = [];
        this.yValues = [];
        this.tags = [];
    }
    return SeriesValues;
})();
function matchesFixedValues(line) {
    var fixedProps = $(".ddlFixedProp");
    for (var i = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        if (prop.val() != "") {
            var header = prop.attr("data-prop");
            var fixedValue;
            if (/^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/.test(prop.val()))
                fixedValue = parseFloat(prop.val());
            else
                fixedValue = prop.val();
            if (line[header] != fixedValue)
                return false;
        }
    }
    return true;
}
function getFormattedPropertyValues(line) {
    var selectedTagIdx = $("#ddlTag").val();
    var str = "<table>";
    for (var _i = 0; _i < headers.length; _i++) {
        var h = headers[_i];
        if (h != selectedTagIdx) {
            str += "<tr>";
            str += "<td>" + h + "</td>";
            str += "<td>" + line[h] + "</td>";
            str += "</tr>";
        }
    }
    str += "</table>";
    return str;
}
$(document).on("click", "#btnRender", function (ev) {
    var selectedXValueIdx = $("#ddlXValues").val();
    var selectedYValueIdx = $("#ddlYValues").val();
    var selectedSeriesIdx = $("#ddlSeries").val();
    var selectedTagIdx = $("#ddlTag").val();
    var distinctSeriesValues = {};
    var seriesValues = {};
    var sortedLines = lines.sort(function (a, b) { return a[selectedXValueIdx] - b[selectedXValueIdx]; });
    console.log(sortedLines);
    for (var _i = 0; _i < sortedLines.length; _i++) {
        var l = sortedLines[_i];
        var sv;
        if (!distinctSeriesValues.hasOwnProperty(l[selectedSeriesIdx]) || !distinctSeriesValues[l[selectedSeriesIdx]]) {
            distinctSeriesValues[l[selectedSeriesIdx]] = true;
            sv = new SeriesValues();
            sv.name = l[selectedSeriesIdx] + "";
            seriesValues[l[selectedSeriesIdx]] = sv;
        }
        else {
            sv = seriesValues[l[selectedSeriesIdx]];
        }
        if (matchesFixedValues(l)) {
            sv.xValues.push(l[selectedXValueIdx]);
            sv.yValues.push(l[selectedYValueIdx]);
            sv.tags.push(l[selectedTagIdx]);
            sv.line = l;
        }
    }
    var series = [];
    for (var serieValue in seriesValues) {
        if (serieValue != "undefined" && seriesValues.hasOwnProperty(serieValue)) {
            // build series
            var sv_1 = seriesValues[serieValue];
            var tuples = [];
            for (var i = 0; i < sv_1.xValues.length; i++) {
                tuples.push({ x: sv_1.xValues[i], y: sv_1.yValues[i], tag: sv_1.tags[i], line: sv_1.line });
            }
            series.push({
                name: sv_1.name,
                data: tuples
            });
        }
    }
    $('#chartContainer').highcharts({
        chart: {
            type: 'scatter',
        },
        title: "",
        plotOptions: {
            scatter: {
                lineWidth: $("#chkConnectPoints").prop("checked") ? 2 : 0
            }
        },
        xAxis: {
            title: { text: selectedXValueIdx }
        },
        yAxis: {
            title: { text: selectedYValueIdx }
        },
        tooltip: {
            useHTML: true,
            formatter: function () {
                return this.point.tag + "<hr/>" + getFormattedPropertyValues(this.point.line);
            }
        },
        series: series,
        credits: false
    });
});
$(document).on("change", "#csvFileInput", function (ev) {
    handleFiles(this.files);
});
$(document).on("change", ".ddl", function (ev) {
    dropdownChanged();
});
//# sourceMappingURL=analyzecsv.js.map