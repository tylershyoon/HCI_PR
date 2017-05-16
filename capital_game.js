// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.

/* Firebase connection */
var config = {
    apiKey: "AIzaSyDs0oJ1XbVWWj4vayCJMIk4yzUh03e2oPY",
    databaseURL: "https://cs374pr3-20130416.firebaseio.com/"
};
firebase.initializeApp(config);
var database = firebase.database();

/* rowNum & undoNum retrieval */
var rowNum, undoNum, redoNum; // rowNum saved
var qnasRef = database.ref("qnas");
var undoStack = database.ref("undoStack");
var redoStack = database.ref("redoStack");

function rowNumUpdate() {
    qnasRef.on("value", function (snapshot) {
        if (snapshot.val() == null) {
            rowNum = 0;
        }
        else {
            rowNum = snapshot.val().length;
        }
        console.log("rowNumUpdate", rowNum);
    });
}
function undoUpdate() {
    undoStack.on("value", function (snapshot) {
        if (snapshot.val() == null) {
            document.getElementById("pr3__undo").disabled = true;
            undoNum = 0;
        }
        else {
            document.getElementById("pr3__undo").disabled = false;
            undoNum = snapshot.val().length;
        }
        console.log("undoNumUpdate", undoNum);
    });
}
function redoUpdate() {
    redoStack.on("value", function (snapshot) {
        if (snapshot.val() == null) {
            document.getElementById("pr3__redo").disabled = true;
            redoNum = 0;
        }
        else {
            document.getElementById("pr3__redo").disabled = false;
            redoNum = snapshot.val().length;
        }
        console.log("redoUpdate:", redoNum);
    });
}

rowNumUpdate();
undoUpdate();
redoUpdate();

/* load countries & capitals from the web */
$( document ).ready(function() {
    document.getElementById('pr2__answer').focus();
    var csvdata = [];
    $.get("https://s3.ap-northeast-2.amazonaws.com/cs374-csv/country_capital_pairs.csv",
        function(data){
            csvdata = data.split("\n");
            var pairs = [];
            for (i = 1; i < csvdata.length; i++) {
                var pair = csvdata[i].split(",");
                var country = pair[0];
                var capital = pair[1];
                pairs += [{"country":country,"capital":capital}];
            }
        });
});

/* Random country retrieval */
function randomNumber(min, max){
    return Math.round(Math.random() * (max-min) + min);
}
var randomCountry_pageload = pairs[randomNumber(0, pairs.length)]['country'];

/* Button press after user types an answer */
function onclickfunc(){
    var rowNum_before_added = rowNum;
    console.log("rN prev", rowNum);
    var qnasRef = database.ref("qnas"); // added declaration
    var undoStack = database.ref("undoStack");
    var currentCountry = document.getElementById('pr2__question').innerHTML;
    var userAnswer = document.getElementById('pr2__answer').value;

    if (userAnswer==""){
        var nextCountry = pairs[randomNumber(0, pairs.length)]['country'];
        document.getElementById('pr2__question').innerHTML = nextCountry;
        document.getElementById('pr2__answer').value = "";
        document.getElementById('pr2__answer').focus();
        return;
    }
    var iscorrect = isCorrect(currentCountry, userAnswer);

    tableExpand(currentCountry, userAnswer, iscorrect);

    undoStack.child(undoNum).set({
        undoNum: undoNum,
        action: 'insert',
        rowNum: rowNum_before_added
    });
    qnasRef.child(rowNum).set({
        currentCountry: currentCountry,
        userAnswer: userAnswer,
        isCorrect: iscorrect[0],
        correctAnswer: iscorrect[1],
        rowNum: rowNum,
        isDeleted : false
    });

    var nextCountry = pairs[randomNumber(0, pairs.length)]['country'];
    document.getElementById('pr2__question').innerHTML = nextCountry;
    document.getElementById('pr2__answer').value = "";
    document.getElementById('pr2__answer').focus();

    var country = nextCountry;
    if (country == "Côte d'Ivoire"){
        country == "cote divoire";
    }
    document.getElementById('map').setAttribute("src", "https://www.google.com/maps/embed/v1/place?key=AIzaSyDs0oJ1XbVWWj4vayCJMIk4yzUh03e2oPY&q="+country+"&maptype=satellite");

}

function selectFilter(ide){
    var filter_value = document.getElementById(ide).value;
    if(filter_value=="Corrects"){
        $(".correct").show();
        $(".wrong").hide();
    }
    else if(filter_value=="Wrongs"){
        $(".wrong").show();
        $(".correct").hide();
    }
    else{
        $(".correct").show();
        $(".wrong").show();
    }
}

function selectUndo(){
    var redoStack = database.ref('redoStack');
    var redoStack_del = database.ref('redoStack');
    console.log("selectUndo begin");
    var target_undo = undoNum-1;
    var undoref = database.ref("undoStack/"+target_undo);
    undoref.once("value", function(snapshot){
        var undo_content = snapshot.val();
        console.log("undo_content:", undo_content);
        if(undo_content.action=="insert"){
            console.log("undo content action == insert");
            var target_qna = database.ref("qnas/"+undo_content.rowNum);
            target_qna.update({isDeleted:true}, function(){
                $("#"+undo_content.rowNum).hide();
                if($("#"+undo_content.rowNum).hasClass("correct")){
                    $("#"+undo_content.rowNum).removeClass('correct');
                    $("#"+undo_content.rowNum).addClass('correct_deleted');
                }
                else if($("#"+undo_content.rowNum).hasClass("wrong")){
                    $("#"+undo_content.rowNum).removeClass('wrong');
                    $("#"+undo_content.rowNum).addClass('wrong_deleted');
                }
                redoStack.child(redoNum).set({
                    action: undo_content.action,
                    rowNum: undo_content.rowNum,
                    redoNum: redoNum
                });
                undoref.remove();
            });
        }
        else if(undo_content.action=="delete"){
            console.log("undo content action == delete");
            console.log("undo_content:", undo_content);
            var target_qna = database.ref("qnas/"+undo_content.rowNum);
            target_qna.update({isDeleted:false}, function(){
                $("#"+undo_content.rowNum).show();
                if($("#"+undo_content.rowNum).hasClass("correct_deleted")){
                    $("#"+undo_content.rowNum).removeClass('correct_deleted');
                    $("#"+undo_content.rowNum).addClass('correct');
                }
                else if($("#"+undo_content.rowNum).hasClass("wrong_deleted")){
                    $("#"+undo_content.rowNum).removeClass('wrong_deleted');
                    $("#"+undo_content.rowNum).addClass('wrong');
                }
                redoStack_del.child(redoNum).set({
                    action: 'delete',
                    rowNum: undo_content.rowNum,
                    redoNum: redoNum
                });
                undoref.remove();
            })
        }
        else if(undo_content.action=="clear") {
            console.log("rows", undo_content.rowNum);
            var target_qnas = undo_content.rowNum;
            for (var i=0;i<target_qnas.length;i++){
                var target_qna = database.ref("qnas/"+ target_qnas[i]);
                target_qna.update({isDeleted:false});
                $("#"+target_qnas[i]).show();
                if($("#"+target_qnas[i]).hasClass("correct_deleted")){
                    $("#"+target_qnas[i]).removeClass('correct_deleted');
                    $("#"+target_qnas[i]).addClass('correct');
                }
                else if($("#"+target_qnas[i]).hasClass("wrong_deleted")){
                    $("#"+target_qnas[i]).removeClass('wrong_deleted');
                    $("#"+target_qnas[i]).addClass('wrong');
                }
            }
            redoStack.child(redoNum).set({
                action: undo_content.action,
                rowNum: target_qnas,
                redoNum: redoNum
            });
            undoref.remove();
        }
    });
}
function selectRedo(){
    console.log("selectRedo begin");
    var target_redo = redoNum-1;
    console.log("target_redo:", target_redo);
    var redoref = database.ref("redoStack/"+target_redo);
    var redo_content;
    redoref.once("value").then(function(snapshot){
        console.log("redoref once begin");
        redo_content = snapshot.val();
        if(redo_content.action=="insert"){
            console.log("redo_content action == insert");
            var target_qna = database.ref("qnas/"+redo_content.rowNum);
            target_qna.update({isDeleted:false}, function(){
                $("#"+redo_content.rowNum).show();
                if($("#"+redo_content.rowNum).hasClass("correct_deleted")){
                    $("#"+redo_content.rowNum).removeClass('correct_deleted');
                    $("#"+redo_content.rowNum).addClass('correct');
                }
                else if($("#"+redo_content.rowNum).hasClass("wrong_deleted")){
                    $("#"+redo_content.rowNum).removeClass('wrong_deleted');
                    $("#"+redo_content.rowNum).addClass('wrong');
                }
                undoStack.child(undoNum).set({
                    action: redo_content.action,
                    rowNum: redo_content.rowNum,
                    undoNum: undoNum
                });
                redoref.remove();
            });
        }
        else if(redo_content.action=="delete"){
            console.log("redo content action == delete");
            console.log("redo_content under delete:", redo_content);
            var target_qna = database.ref("qnas/"+redo_content.rowNum);
            console.log("target_qna: ", target_qna);
            target_qna.update({isDeleted:true}, function(){
                $("#"+redo_content.rowNum).hide();
                if($("#"+redo_content.rowNum).hasClass("correct")){
                    $("#"+redo_content.rowNum).removeClass('correct');
                    $("#"+redo_content.rowNum).addClass('correct_deleted');
                }
                else if($("#"+redo_content.rowNum).hasClass("wrong")){
                    $("#"+redo_content.rowNum).removeClass('wrong');
                    $("#"+redo_content.rowNum).addClass('wrong_deleted');
                }
                undoStack.child(undoNum).set({
                    action: redo_content.action,
                    rowNum: redo_content.rowNum,
                    undoNum: undoNum
                });
                redoref.remove();
            });
        }
        else if(redo_content.action=="clear"){
            var target_qnas = redo_content.rowNum;
            for (var i=0;i<target_qnas.length;i++){
                var target_qna = database.ref("qnas/"+target_qnas[i]);
                target_qna.update({isDeleted:true});
                $("#"+target_qnas[i]).hide();
                if($("#"+target_qnas[i]).hasClass("correct")){
                    $("#"+target_qnas[i]).removeClass('correct');
                    $("#"+target_qnas[i]).addClass('correct_deleted');
                }
                else if($("#"+target_qnas[i]).hasClass("wrong")){
                    $("#"+target_qnas[i]).removeClass('wrong');
                    $("#"+target_qnas[i]).addClass('wrong_deleted');
                }
            }
            undoStack.child(undoNum).set({
                action: redo_content.action,
                rowNum: target_qnas,
                undoNum: undoNum
            });
            redoref.remove();
        }
    });
}

function undoredoShortcuts(event){
    if (event.ctrlKey && event.keyCode==90){
        selectUndo();
    }
    else if (event.ctrlKey && event.keyCode==89){
        selectRedo();
    }
}

function selectClear(){
    var cleared = [];
    for(var i=0;i<rowNum;i++){
        var clearRef = database.ref("qnas/" + i);
        console.log("test", clearRef.isDeleted);
        clearRef.once("value", function(snapshot){
            console.log("test2", snapshot.val().isDeleted);
            if(snapshot.val().isDeleted==false){
                clearRef.update({isDeleted:true});
                $("#"+i).hide();
                if($("#"+i).hasClass("correct")){
                    $("#"+i).removeClass('correct');
                    $("#"+i).addClass('correct_deleted');
                }
                else if($("#"+i).hasClass("wrong")){
                    $("#"+i).removeClass('wrong');
                    $("#"+i).addClass('wrong_deleted');
                }
                cleared.push(i);
            }
            console.log("cleared:", cleared);
        });
    }
    if (cleared.length!=0) {
        undoStack.child(undoNum).set({
            undoNum: undoNum,
            action: 'clear',
            rowNum: cleared
        });
    }
}

function deleteButton(ide){
    $("#"+ide).hide();
    if($("#"+ide).hasClass("correct")){
        $("#"+ide).removeClass('correct');
        $("#"+ide).addClass('correct_deleted');
    }
    else if($("#"+ide).hasClass("wrong")){
        $("#"+ide).removeClass('wrong');
        $("#"+ide).addClass('wrong_deleted');
    }
    var deleteRef = database.ref("qnas/"+ ide);
    deleteRef.update({isDeleted:true});
    undoStack.child(undoNum).set({
        undoNum: undoNum,
        action: 'delete',
        rowNum: ide
    });
}

function getCountry(){
    var output = [];
    for (var i=0; i< pairs.length; i++){
        output.push(pairs[i]['capital']);
    }
    return output;
}

function isCorrect(country, usrAnswer){
    for(var i=0; i<pairs.length; i++){
        //console.log(pairs[i]);
        //console.log(country);
        //console.log(usrAnswer);
        if(pairs[i]['country']==country){
            if(pairs[i]['capital']==usrAnswer){
                return [true, pairs[i]['capital']];
            }
            else{
                return [false, pairs[i]['capital']];
            }
        }
    }
    //tableReload();
}

function tableExpand(currentCountry, userAnswer, iscorrect) {
    var table = document.getElementById("main__table");
    if(document.getElementById('filterw').checked){
        if(iscorrect[0]==true){
            document.getElementById('filtera').checked = true;
            selectFilter('filtera');
        }
    }
    else if(document.getElementById('filterc').checked){
        if(iscorrect[0]==false){
            document.getElementById('filtera').checked = true;
            selectFilter('filtera');
        }
    }

    if(iscorrect[0]==true){
        //rowNum += 1;
        var row = table.insertRow(3);
        row.className = "correct";
        row.id = rowNum.toString();
        var c1 = row.insertCell(0);
        c1.className = "countryhover";
        var c2 = row.insertCell(1);
        var c3 = row.insertCell(2);

        var country = currentCountry;
        if (country=="Côte d'Ivoire"){
            country = "cote divoire";
        }
        var url = 'https://www.google.com/maps/embed/v1/place?key=AIzaSyDs0oJ1XbVWWj4vayCJMIk4yzUh03e2oPY&q=' + country + "&maptype=satellite";
        var onclick = 'document.getElementById(\'map\').setAttribute(\'src\',\'';
        var inner = "<div onclick=\"" + onclick + url +"\')" + '\"' + ">" + currentCountry + "</div>";
        //console.log(inner);

        c1.innerHTML = inner;
        c2.innerHTML = userAnswer;

        var button = " <button type='button' onclick='deleteButton(" + row.id + ")'>Delete</button>";
        c3.innerHTML = "<i class='fa fa-check' aria-hidden='true'></i>" + button;
    }
    else{
        var row = table.insertRow(3);
        row.className = "wrong";
        row.id = rowNum.toString();
        var c1 = row.insertCell(0);
        c1.className = "countryhover";
        var c2 = row.insertCell(1);
        c2.className = "strikethrough";
        var c3 = row.insertCell(2);

        var country = currentCountry;
        if (country=="Côte d'Ivoire"){
            country = "cote divoire";
        }

        var url = 'https://www.google.com/maps/embed/v1/place?key=AIzaSyDs0oJ1XbVWWj4vayCJMIk4yzUh03e2oPY&q=' + country + "&maptype=satellite";
        var onclick = 'document.getElementById(\'map\').setAttribute(\'src\',\'';
        var inner = "<div onclick=\"" + onclick + url +"\')" + '\"' + ">" + currentCountry + "</div>";
        //console.log(inner);

        c1.innerHTML = inner;
        c2.innerHTML = userAnswer;

        var button = " <button type='button' onclick='deleteButton(" + row.id + ")'>Delete</button>";
        c3.innerHTML = iscorrect[1] + button;
    }
}

function tableReload(){
    var table = document.getElementById("main__table");
    console.log("func");
    qnasRef.once("value", function(snapshot){
        snapshot.forEach(function(childSnapshot){
            var childData = childSnapshot.val();
            var row = table.insertRow(3);
            var c1 = row.insertCell(0);
            c1.className = "countryhover";
            var c2 = row.insertCell(1);
            var c3 = row.insertCell(2);
            if (childData.isCorrect) {
                row.className = "correct";
            }
            else {
                row.className = "wrong";
                c2.className = "strikethrough";
            }
            row.id = childData.rowNum.toString();
            var country = childData.currentCountry;
            if (country=="Côte d'Ivoire"){
                country = "cote divoire";
            }
            var url = 'https://www.google.com/maps/embed/v1/place?key=AIzaSyDs0oJ1XbVWWj4vayCJMIk4yzUh03e2oPY&q=' + country + "&maptype=satellite";
            var onclick = 'document.getElementById(\'map\').setAttribute(\'src\',\'';
            var inner = "<div onclick=\"" + onclick + url +"\')" + '\"' + ">" + childData.currentCountry + "</div>";
            //console.log(inner);
            c1.innerHTML = inner;
            c2.innerHTML = childData.userAnswer;

            var button = " <button type='button' onclick='deleteButton(" + row.id + ")'>Delete</button>";
            c3.innerHTML = childData.correctAnswer + button;

            if (childData.isDeleted){
                $("#"+childData.rowNum).hide();
                if(childData.isCorrect){
                    $("#"+childData.rowNum).removeClass('correct');
                    $("#"+childData.rowNum).addClass('correct_deleted');
                }
                else{
                    $("#"+childData.rowNum).removeClass('wrong');
                    $("#"+childData.rowNum).addClass('wrong_deleted');
                }
            }
        })
    });
}

































