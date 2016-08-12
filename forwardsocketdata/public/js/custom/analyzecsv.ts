function handleFiles(files) {
    getAsText(files[0]);
}

function getAsText(fileToRead) {
    var reader = new FileReader();
    // Read file into memory as UTF-8      
    reader.readAsText(fileToRead);
    // Handle errors load
    reader.onload = ev => {
        var csv = (<any>ev).target.result;
        processData(csv);
        fillDropdowns();
    };

    reader.onerror = ev => {
        alert("Unable to load csv file");
    };
}

var headers: string[];
var lines: any[];


function processData(csv) {
    var allTextLines = csv.split(/\r\n|\n/);

    lines = [];
    for (var i = 0; i < allTextLines.length; i++) {

        if (i == 0)
            headers = allTextLines[i].split(';');
        else {
            var parts: string[] = allTextLines[i].split(';');
            var obj = {};

            for (let j: number = 0; j < parts.length; j++) {

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
    for (let header of headers.sort()) {
        console.log(header);
        ddls.append($('<option></option>').val(header).html(header));
    }
    
    if(headers.indexOf("Name") != -1) {
        $("#ddlTag").val("Name");
    }
    
    dropdownChanged();
}

function dropdownChanged() {

    //  fill fixed remaining properties
    var otherProperties = [];

    var dynamicProperties = [$("#ddlXValues").val(), $("#ddlYValues").val(), $("#ddlSeries").val()];

    for (let h of headers) {
        let isDynamicProp = false;
        for (let p of dynamicProperties) {
            if (h == p) { isDynamicProp = true; break; }
        }
        if (!isDynamicProp)
            otherProperties.push(h);
    }



    // try and save the fixed prop values
    var fixedPropState = {};
    var fixedProps = $(".ddlFixedProp");
    for (let i: number = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        fixedPropState[prop.attr("data-prop")] = prop.val();
    }

    $("#frmFixedValues").empty();
    if (otherProperties.length > 0) {
        for (let h of otherProperties.sort()) {

            $("#frmFixedValues").append(`<div class="form-group">
                        <label for="ddlFixedProp${h}" class="col-sm-3 control-label">${h}</label>
                        <div class="col-sm-9">
                            <select id="ddlFixedProp${h}" class="form-control ddlFixedProp" data-prop="${h}"></select>
                        </div>
                    </div>`);

            var ddl = $("#ddlFixedProp" + h);
            var values = getDistinctValuesFor(h);
            ddl.append($('<option></option>').val("").html("[Ignore]"));
            console.log(values);
            for (let v of values) {
                ddl.append($('<option></option>').val(v).html(v));
            }
            if (values.length == 1)
                ddl.closest(".form-group").hide();
        }

        // restore if possible
        fixedProps = $(".ddlFixedProp");
        for (let i: number = 0; i < fixedProps.length; i++) {
            var prop = $($(fixedProps).get(i));
            if (typeof fixedPropState[prop.attr("data-prop")] != "undefined") {
                prop.val(fixedPropState[prop.attr("data-prop")]);
            }
        }
    }
    else
        $("#frmFixedValues").append("No fixed values");
}


function getDistinctValuesFor(header: string): any[] {
    let distinctValues = {};
    for (let l of lines) {
        distinctValues[l[header]] = true;
    }

    let arr: any[] = [];
    for (let p in distinctValues) {
        if (p != "undefined" && distinctValues.hasOwnProperty(p)) {
            arr.push(p);
        }
    }
    return arr.sort();
}

class SeriesValues {
    name: string = "";
    xValues: number[] = [];
    yValues: number[] = [];
    tags: string[] = [];
    line: any;
}

function matchesFixedValues(line) {

    var fixedProps = $(".ddlFixedProp");

    for (let i: number = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        if (prop.val() != "") { // otherwise ignore = matches
            var header = prop.attr("data-prop");

            var fixedValue;
            if (/^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/.test(prop.val()))
                fixedValue = parseFloat(prop.val())
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


    let str = "<table>";
    for (let h of headers) {
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

$(document).on("click", "#btnRender", ev => {

    var selectedXValueIdx = $("#ddlXValues").val();
    var selectedYValueIdx = $("#ddlYValues").val();
    var selectedSeriesIdx = $("#ddlSeries").val();

    var selectedTagIdx = $("#ddlTag").val();

    var distinctSeriesValues: any = {};
    var seriesValues = {};

    var sortedLines = lines.sort((a, b) => { return a[selectedXValueIdx] - b[selectedXValueIdx]; });
    console.log(sortedLines);
    for (let l of sortedLines) {

        var sv: SeriesValues;
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
    for (let serieValue in seriesValues) {
        if (serieValue != "undefined" && seriesValues.hasOwnProperty(serieValue)) {
            // build series

            let sv: SeriesValues = seriesValues[serieValue];
            var tuples = [];
            for (let i: number = 0; i < sv.xValues.length; i++) {
                tuples.push({ x: sv.xValues[i], y: sv.yValues[i], tag: sv.tags[i], line: sv.line });
            }
            series.push({
                name: sv.name,
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
            formatter: function() {
                return this.point.tag + "<hr/>" + getFormattedPropertyValues(this.point.line);
            }
        },
        series: series,
        credits: false
    });
});

$(document).on("change", "#csvFileInput", function(ev) {
    handleFiles(this.files);
});

$(document).on("change", ".ddl", function(ev) {
    dropdownChanged();
});