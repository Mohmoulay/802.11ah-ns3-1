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
        loadConfigurationFromHash();

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
                    obj[headers[j]] = Math.round(parseFloat(parts[j]) * 100) / 100;
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
    for (let h of seriesVal)
        dynamicProperties.push(h);

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

            let html = "";
            html += `<option value="">[Ignore]</option>`;
            //ddl.append($('<option></option>').val("").html("[Ignore]"));
            for (let v of values) {
                html += `<option value="${v}">${v}</option>`;

                //ddl.append($('<option></option>').val(v).html(v));
            }
            ddl.append(html);
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
    lines: string[] = [];
}

function matchesFixedValues(line) {

    var fixedProps = $(".ddlFixedProp");

    for (let i: number = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        if (prop.val() != "") { // otherwise ignore = matches
            var header = prop.attr("data-prop");

            var fixedValue;
            if (/^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/.test(prop.val()))
                fixedValue = Math.round(parseFloat(prop.val()) * 100) / 100;
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

    // make it an array to be consistent
    if (!(selectedSeriesIdx instanceof Array))
        selectedSeriesIdx = [selectedSeriesIdx];

    var selectedTagIdx = $("#ddlTag").val();

    var distinctSeriesValues: any = {};
    var seriesValues = {};

    var sortedLines = lines.sort((a, b) => { return a[selectedXValueIdx] - b[selectedXValueIdx]; });
    for (let l of sortedLines) {

        let isValid: boolean = true;
        let nameParts: string[] = [];
        let keyParts: any[] = [];
        for (let ss of selectedSeriesIdx) {
            if (typeof l[ss] == "undefined") {
                isValid = false;
                break;
            }
            keyParts.push(l[ss]);
            nameParts.push(ss + ":" + l[ss]);
        }

        if (isValid) {
            let key: string = keyParts.join("__");

            var sv: SeriesValues;
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

    let seriesKeys: string[] = [];
    for (let serieValue in seriesValues) {
        if (typeof serieValue != "undefined" && seriesValues.hasOwnProperty(serieValue))
            seriesKeys.push(serieValue);
    }
    // build series, sort by series names
    console.log(seriesKeys.sort(function (a, b) { return seriesValues[a].name - seriesValues[b].name; }));
    for (let serieValue of seriesKeys.sort(function (a, b) { return seriesValues[a].name - seriesValues[b].name; })) {
        let sv: SeriesValues = seriesValues[serieValue];
        var tuples = [];
        for (let i: number = 0; i < sv.xValues.length; i++) {
            tuples.push({ x: sv.xValues[i], y: sv.yValues[i], tag: sv.tags[i], line: sv.lines[i] });
        }
        series.push({
            name: sv.name,
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
        credits: false,
        exporting:{
            chartOptions:{
                title: {
                    text:''
                }
            }
        }
    });
});

function saveConfigurationInHash() {
    var selectedXValueIdx = $("#ddlXValues").val();
    var selectedYValueIdx = $("#ddlYValues").val();
    var selectedSeriesIdx = $("#ddlSeries").val();
    var selectedTagIdx = $("#ddlTag").val();

    let obj:any = {};
    obj.XValues = selectedXValueIdx;
    obj.YValues = selectedYValueIdx;
    obj.Series = selectedSeriesIdx;
    obj.Tag = selectedTagIdx;

    var fixedProps = $(".ddlFixedProp");
    for (let i: number = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        obj[prop.attr("data-prop")] = prop.val();
    }
    window.location.hash = $.param(obj);
}

var QueryStringToHash = function QueryStringToHash  (query) {
  var query_string = {};
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair:string[] = vars[i].split("=");
    pair[0] = decodeURIComponent(pair[0]);
    pair[1] = decodeURIComponent(pair[1]);

    pair[0] = pair[0].replace("[]", "");

    // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = pair[1];
    	// If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [ query_string[pair[0]], pair[1] ];
      query_string[pair[0]] = arr;
    	// If third or later entry with this name
    } else {
      query_string[pair[0]].push(pair[1]);
    }
  } 
  return query_string;
};

function loadConfigurationFromHash() {
    if(window.location.hash !="") {
        let obj:any = QueryStringToHash(window.location.hash.substr(1));
        if(obj.XValues) $("#ddlXValues").val(obj.XValues);
        if(obj.YValues) $("#ddlYValues").val(obj.YValues);
        if(obj.Series) $("#ddlSeries").val(obj.Series);

        // ensure visibility of correct fixed props 
        dropdownChanged();

        for(let p in obj) {
            if(obj.hasOwnProperty(p) && p != "XValues" && p != "YValues" && p != "Series" && p != "Tag") {
                $(".ddlFixedProp[data-prop='" + p + "']").val(obj[p]);
            }
        }
    }
}





$(document).on("change", "#csvFileInput", function (ev) {
    handleFiles(this.files);
});

$(document).on("change", ".ddl", function (ev) {
    dropdownChanged();
    saveConfigurationInHash();
});

$(document).on("change", ".ddlFixedProp", function (ev) {
    saveConfigurationInHash();
});

$(document).ready(function () {
    $(".ddl").select2();
});
