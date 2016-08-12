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
    var dynamicProperties = [$("#ddlXValues").val(), $("#ddlYValues").val()];
    var seriesVal = $("#ddlSeries").val();
    if (!(seriesVal instanceof Array))
        seriesVal = [seriesVal];
    for (var _i = 0; _i < seriesVal.length; _i++) {
        var h = seriesVal[_i];
        dynamicProperties.push(h);
    }
    for (var _a = 0; _a < headers.length; _a++) {
        var h = headers[_a];
        var isDynamicProp = false;
        for (var _b = 0; _b < dynamicProperties.length; _b++) {
            var p = dynamicProperties[_b];
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
        for (var _c = 0, _d = otherProperties.sort(); _c < _d.length; _c++) {
            var h = _d[_c];
            $("#frmFixedValues").append("<div class=\"form-group\">\n                        <label for=\"ddlFixedProp" + h + "\" class=\"col-sm-3 control-label\">" + h + "</label>\n                        <div class=\"col-sm-9\">\n                            <select id=\"ddlFixedProp" + h + "\" class=\"form-control ddlFixedProp\" data-prop=\"" + h + "\"></select>\n                        </div>\n                    </div>");
            var ddl = $("#ddlFixedProp" + h);
            var values = getDistinctValuesFor(h);
            var html = "";
            html += "<option value=\"\">[Ignore]</option>";
            //ddl.append($('<option></option>').val("").html("[Ignore]"));
            for (var _e = 0; _e < values.length; _e++) {
                var v = values[_e];
                html += "<option value=\"" + v + "\">" + v + "</option>";
            }
            ddl.append(html);
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
        this.lines = [];
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
    // make it an array to be consistent
    if (!(selectedSeriesIdx instanceof Array))
        selectedSeriesIdx = [selectedSeriesIdx];
    var selectedTagIdx = $("#ddlTag").val();
    var distinctSeriesValues = {};
    var seriesValues = {};
    var sortedLines = lines.sort(function (a, b) { return a[selectedXValueIdx] - b[selectedXValueIdx]; });
    for (var _i = 0; _i < sortedLines.length; _i++) {
        var l = sortedLines[_i];
        var isValid = true;
        var nameParts = [];
        var keyParts = [];
        for (var _a = 0; _a < selectedSeriesIdx.length; _a++) {
            var ss = selectedSeriesIdx[_a];
            if (typeof l[ss] == "undefined") {
                isValid = false;
                break;
            }
            keyParts.push(l[ss]);
            nameParts.push(ss + ":" + l[ss]);
        }
        if (isValid) {
            var key = keyParts.join("__");
            var sv;
            if (!distinctSeriesValues.hasOwnProperty(key) || !distinctSeriesValues[key]) {
                distinctSeriesValues[key] = true;
                sv = new SeriesValues();
                sv.name = nameParts.join(",");
                seriesValues[key] = sv;
            }
            else {
                sv = seriesValues[key];
            }
            if (matchesFixedValues(l)) {
                sv.xValues.push(l[selectedXValueIdx]);
                sv.yValues.push(l[selectedYValueIdx]);
                sv.tags.push(l[selectedTagIdx]);
                sv.lines.push(l);
            }
        }
    }
    var series = [];
    var seriesKeys = [];
    for (var serieValue in seriesValues) {
        if (typeof serieValue != "undefined" && seriesValues.hasOwnProperty(serieValue))
            seriesKeys.push(serieValue);
    }
    // build series, sort by series names
    console.log(seriesKeys.sort(function (a, b) { return seriesValues[a].name - seriesValues[b].name; }));
    for (var _b = 0, _c = seriesKeys.sort(function (a, b) { return seriesValues[a].name - seriesValues[b].name; }); _b < _c.length; _b++) {
        var serieValue = _c[_b];
        var sv_1 = seriesValues[serieValue];
        var tuples = [];
        for (var i = 0; i < sv_1.xValues.length; i++) {
            tuples.push({ x: sv_1.xValues[i], y: sv_1.yValues[i], tag: sv_1.tags[i], line: sv_1.lines[i] });
        }
        series.push({
            name: sv_1.name,
            data: tuples
        });
    }
    $('#chartContainer').highcharts({
        chart: {
            type: 'scatter',
        },
        title: "",
        plotOptions: {
            scatter: {
                lineWidth: $("#chkConnectPoints").prop("checked") ? 2 : 0
            },
            series: {
                turboThreshold: 10000
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
$(document).ready(function () {
    $(".ddl").select2();
});
//# sourceMappingURL=analyzecsv.js.map