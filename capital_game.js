// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.

/* Firebase connection */
var config = {
    apiKey: "AIzaSyDs0oJ1XbVWWj4vayCJMIk4yzUh03e2oPY",
    databaseURL: "https://cs374pr3-20130416.firebaseio.com/"
};
firebase.initializeApp(config);
var database = firebase.database();

/* rowNum & actionNum retrieval */
var rowNum; // rowNum saved
var actionNum; // actionNum saved
var qnasRef = database.ref("qnas");
var actionStack = database.ref("actionStack");
qnasRef.on("value", function(snapshot){
    if (snapshot.val() == null){
        rowNum = 0;
    }else{
        rowNum = snapshot.val().length;
    }
    console.log("rowNum", rowNum);
});
actionStack.on("value", function(snapshot){
    if (snapshot.val() == null){
        actionNum = 0;
    }
    else{
        actionNum = snapshot.val().length;
    }
    console.log("actionNum", actionNum);
});

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
    var actionStack = database.ref("actionStack");
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

    actionStack.child(actionNum).set({
        action: 'insert',
        showing: true,
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
    //
}
function selectRedo(){
    //
}
function selectClear(){
    qnasRef.once('value', function(snapshot){
        snapshot.forEach(function(childSnapshot){
            childSnapshot.update({isDeleted: true});
        });
    });
    actionStack.child(actionNum).set({
        action: 'clear',
        showing: true
    });
}

function deleteButton(ide){
    $("#"+ide).remove();

    var deleteRef = database.ref("qnas/"+ ide);
    deleteRef.update({isDeleted:true});
    actionStack.child(actionNum).set({
        action: 'delete',
        applying: true,
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
        //console.log(row.id);
        var c1 = row.insertCell(0);
        var c2 = row.insertCell(1);
        var c3 = row.insertCell(2);

        c1.innerHTML = currentCountry;
        c2.innerHTML = userAnswer;

        var button = " <button type='button' onclick='deleteButton(" + row.id + ")'>Delete</button>";
        c3.innerHTML = "<i class='fa fa-check' aria-hidden='true'></i>" + button;
    }
    else{
        //rowNum += 1;
        //console.log(rowNum);
        var row = table.insertRow(3);
        row.className = "wrong";
        row.id = rowNum.toString();
        //console.log(row.id);
        var c1 = row.insertCell(0);
        var c2 = row.insertCell(1);
        c2.className = "strikethrough";
        var c3 = row.insertCell(2);

        c1.innerHTML = currentCountry;
        c2.innerHTML = userAnswer;

        var button = " <button type='button' onclick='deleteButton(" + row.id + ")'>Delete</button>";
        c3.innerHTML = iscorrect[1] + button;
    }
}

function tableReload(){
    var table = document.getElementById("main__table");
    qnasRef.once("value", function(snapshot){
        snapshot.forEach(function(childSnapshot){
            var childData = childSnapshot.val();
            console.log(childData.userAnswer);
        })
    });
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

}