// forked from animalia, translated to English by arnaudin
var w = new Window("dialog { text: 'PDF Loader', frameLocation:[400, 200], alignChildren:['fill', 'top'], filePnl: Panel { text: 'PDF file', orientation:'row', alignChildren:['left', 'center'], loadBtn: Button { text:'Select file...', helpTip :'Browse for a file, or paste the file path into the text box to the right.'}, et: EditText { text:'' , preferredSize: [220, 20]}, }, rangePnl: Panel { text: 'Pages', orientation:'column', alignChildren:['fill', 'top'], range: Group {allRb: RadioButton { text:'All pages', value:true, helpTip: 'Import all pages in the PDF file.'}, rangeRb: RadioButton { text:'Page range:', helpTip: 'Select a range of pages to import. For example: 1-5 or 1, 2, 3 or 1, 2-4, 5, 7-8.'} et: EditText { text: '', characters:25, properties:{multiline:true} }}, caGrp: Group{artboardsCb: Checkbox { text:'Create Artboards', preferredSize: [84, 20], helpTip: 'Create Artboards in Illustrator CS4 and greater.'}, st: StaticText { text: 'Size:' }, et: EditText { text:'20', characters:3}, st2: StaticText { text:'pt' }}, }, dividerLine: Panel { preferredSize: [280, 1], margins:0, }, btn: Group { orientation:'row', alignChildren:['right', 'center'], cancelBtn: Button { text:'Cancel', properties:{name:'cancel'}}, buildBtn: Button { text:'Open', properties:{name:'ok'} }}}");
w.rangePnl.caGrp.artboardsCb.enabled = w.rangePnl.caGrp.artboardsCb.value = app.version.split(".")[0] > 13;
w.filePnl.loadBtn.onClick = function () {
	var pdfile = File.openDialog('Select the PDF file', '*.pdf, *.ai');
	pdfile && w.filePnl.et.text = pdfile.fsName;
};
w.rangePnl.range.et.onChange = function () {
	this.parent.rangeRb.value = true;
};
w.btn.buildBtn.onClick = function go() {
    var start = new Date().getTime(),
        finish, totalSeconds, minutes, seconds, pdfile = w.filePnl.et.text,
        allPage = w.rangePnl.range.allRb.value,
        pageRange = w.rangePnl.range.et.text,
        createAbs = w.rangePnl.caGrp.artboardsCb.value,
        gap = w.rangePnl.caGrp.et.text,
        psArr = [], maxArr = null, pageArr = null,
        targetDoc, sourceDoc, targetLayer, width, height, pageCount,
        pdfOptions = app.preferences.PDFFileOptions,
        oldInteractionPref = app.userInteractionLevel;
	w.close(0);
	app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
	pdfOptions.pageToOpen = 1;
	app.open(new File(pdfile));
	width = activeDocument.width;
	height = activeDocument.height;
	activeDocument.close(SaveOptions.DONOTSAVECHANGES);
	if (allPage) {
		pageCount = getPDFPageCount(new File(pdfile));
		if (!pageCount) return;
		mainloop(pageCount, 0, pageCount);
	} else {
		maxArr = (function (){for (var i = 0, a = []; ++i < 101; a.push(i)); return a})();
		pageArr = pageRange.replace(/\s/g, '')
			.replace(/(\d+)-(\d+)/g, function ($1, $2, $3){return maxArr.slice($2 - 1, $3)})
			.split(',');
		mainloop(pageArr.length - 1, -1, pageArr.length);
	}
	if (createAbs) {
		var layers = activeDocument.layers;
		layers[layers.length - 1].remove();
		psArr = psArr.reverse();
		for (var k = layers.length - 1; k >= 0; k--) {
			if (layers[k].groupItems.length > 0) {
				layers[k].visible = true;
				var myGroup = layers[k].groupItems[0];
				myGroup.top = activeDocument.artboards[k].artboardRect[1] + psArr[k][0] - height;
				myGroup.left = activeDocument.artboards[k].artboardRect[0] + psArr[k][1];
				layers[k].visible = false;
			}
		}
	}
	finish = new Date().getTime();
	totalSeconds = (finish - start) / 1000;
	minutes = Math.floor(totalSeconds / 60);
	seconds = totalSeconds % 60;
	alert('Operation completed.\nTo view PDF pages adjust layer visibility. Alt-click in the visibility column to toggle all layers.\n Opened ' + activeDocument.layers.length + ' pages in ' + minutes + ' minutes ' + Math.round(seconds) + ' seconds');
	app.userInteractionLevel = oldInteractionPref;

	function mainloop(start, end, pages) {
		if (createAbs) targetDoc = app.documents.add(DocumentColorSpace.CMYK, width, height, pages, DocumentArtboardLayout.GridByRow, gap, Math.round(Math.sqrt(pages)));
		else targetDoc = app.documents.add(DocumentColorSpace.CMYK, width, height);
		for (var i = start; i > end; i--) {
			p = pageArr ? pageArr[i] : i;
			pdfOptions.pageToOpen = p;
			sourceDoc = app.open(new File(pdfile));
			targetLayer = targetDoc.layers.add();
			targetLayer.name = "Page " + p;
			main(sourceDoc, targetLayer, psArr);
		}
	}
};
w.btn.cancelBtn.onClick = function () {
	w.close(0);
};
w.show();

function main(sourceDoc, targetLayer, psArr) {
	if (!sourceDoc.pageItems.length) {
		sourceDoc.close(SaveOptions.DONOTSAVECHANGES);
		psArr.push(null);
		return
	}
	sourceDoc.pageItems[0].selected = true;
	if (!sourceDoc.pageItems[sourceDoc.pageItems.length - 1].selected) {
		groupAll(sourceDoc);
	}
	psArr.push([sourceDoc.groupItems[0].top, sourceDoc.groupItems[0].left]);
	sourceDoc.groupItems[0].duplicate().moveToEnd(targetLayer);
	targetLayer.visible = false;
	sourceDoc.close(SaveOptions.DONOTSAVECHANGES);
}

function groupAll(doc) {
	var group = doc.layers.add().groupItems.add(),
		a, layer = doc.layers[1];
	for (a = layer.pageItems.length; a-- > 0; layer.pageItems[a].move(group, ElementPlacement.PLACEATBEGINNING));
}

// thanks to jxswm and Jezz!
function getPDFPageCount(f) {
	var gotCount = false,
		next_line, p;
	if (BridgeTalk.isInstalled('bridge') && BridgeTalk.isRunning('bridge')) {
		return getPDFCount_Br(f);
	}
	f.open('r');
	while (!gotCount) {
		next_line = f.readln();
		if (f.eof) {
			alert("Unable to get total number of pages");
			f.close();
			return 0
		}
		if (next_line.indexOf('/N ') > 0) {
			p = next_line.match(/\/N (\d+)\/T/)[1];
			gotCount = true;
		} else if (next_line.indexOf('/Pages>>') > 0) {
			p = next_line.match(/\/Count (\d+)\/K/)[1];
			gotCount = true;
		}
	}
	f.close();
	return Number(p);
}

//by Paul MR, http://www.ps-scripts.com/bb/viewtopic.php?f=13&t=2769&start=0#p12035
function getPDFCount_Br(file) {
	var f = new File(file),
		data, timeOutAt, currentTime, bt = new BridgeTalk();
	bt.target = "bridge";
	bt.body = 'function a(){app.document.setPresentationMode("browser","' + f.path + '");tn = new Thumbnail( File("' + f + '") ); return tn.core.itemContent.pageCount}a();';
	bt.onResult = function (inBT) {
        data = eval(inBT.body)
    };
	bt.onError = function (inBT) {
        data = '';
    };
	bt.send();
	bt.pump();
	$.sleep(100);
	timeOutAt = (new Date()).getTime() + 5000;
	currentTime = (new Date()).getTime();
	while ((currentTime < timeOutAt) && (undefined == data)) {
		bt.pump();
		$.sleep(100);
		currentTime = (new Date()).getTime();
	}
	undefined == data && data = 0;
	return data;
}