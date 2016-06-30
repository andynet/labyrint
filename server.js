//---funkcie_na_generovanie_bludiska-----------------------------------------------------------------------------------
function make_2D(size){
  var a = [];
  for (var i = 0; i < size; i++) {
    a.push([]);
    for (var j = 0; j < size; j++) {
      a[i].push(0);
    }
  }
  return a;
}

function make_net(a){
  for (var i = 0; i < a.length; i++){
    for (var j = 0; j < a[i].length; j++){
      if ((i%2 == 1)&&(j%2 == 1)){
        a[i][j] = 1;
      }
    }
  }
}

function make_paths(a, n, size){

  for (var i = 0; i < n; i++) {
    
  var sur1 = 2*((Math.floor(Math.random()*((size-3)/2)))+1); //parne od 2 do size-1
  var sur2 = (2*(Math.floor(Math.random()*((size-1)/2))))+1; //neparne od 1 do size-2

  a[sur1][sur2] = 1;

  var sur1 = 2*((Math.floor(Math.random()*((size-3)/2)))+1); //parne od 2 do size-1
  var sur2 = (2*(Math.floor(Math.random()*((size-1)/2))))+1; //neparne od 1 do size-2

  a[sur2][sur1] = 1;

  }
}

function rekurzia(a, x, y, smer){

  //console.log("na pole ", x, " ", y, " som dosiel ", smer);

  if(a[x][y] == 2){
    a[x][y]++;
    //console.log("na pole ", x, " ", y, " som dosiel ", smer, " a zmenil som ho na 3");
  }
  if(a[x][y] == 1){
    a[x][y]++;
    //console.log("zmenil som pole")
    if (smer != "zhora") {rekurzia(a, x-1, y, "zdola");}
    if (smer != "sprava") {rekurzia(a, x, y+1, "zlava");}
    if (smer != "zdola") {rekurzia(a, x+1, y, "zhora");}
    if (smer != "zlava") {rekurzia(a, x, y-1, "sprava");}
  }
}

function uprav(a, size){
  var completed = true;
  for (var i = 0; i < size; i++){
    for (var j = 0; j < size; j++){
      if (a[i][j] == 1){completed = false;}
      if ((a[i][j] == 3)&&(((i+j)%2)==0)) {a[i][j] = 1;}
      if ((a[i][j] == 3)&&(((i+j)%2)==1)) {a[i][j] = 0;}
      if (a[i][j] == 2) {a[i][j] = 1;}
    }
  }
  return completed;
}

function make_matrix(size){
  var a = make_2D(size);
  var hotovo = false;
  make_net(a);

  while (hotovo == false){
    make_paths(a, 100, size);
    rekurzia(a, 1, 1, "");
    hotovo = uprav(a, size);
  }

  uprav(a, size);
  //console.log(a);
  return a;
}
//---------------------------------------------------------------------------------------------------------------------

var fs = require ('fs');


var server = require ('http').createServer (function (req, res) {
  fs.readFile('index.html', function (err, data) {
    if (err) {
      res.writeHead (500);
      res.end ('Error loading index.html');
    }
    else {
      res.writeHead (200, {'Content-Type': 'text/html'});
      res.end (data);
    }
  });
});
var io = require ('socket.io').listen (server);

server.listen (9000, function () {
  console.log ('Listen on port 9000');
});

//---funkcie-----------------------------------------------------------------------------------------------------------

var players = [];
var rooms = [];
var pocet = 0;
var id_player = 0;

function Player(id, x, y, socket) {
  this.id = id;
  this.socket = socket;
  this.x = x;
  this.y = y;
  this.hide = 0;
  this.room = -1;
  id_player++;
}

function Room(meno, size){
  this.id = pocet;
  this.label = meno;
  this.matrix = make_matrix(size);
  this.num = 0;
  pocet++;
}

function vypisMatrix(matrix){
	var size = matrix.length;
	var text = "";
	for (var i = 0; i < size; i++) {
		for (var j = 0; j < size; j++) {
			text += matrix[i][j];
		}
		text += "\n"
	}
	return text;
} 


//---socket------------------------------------------------------------------------------------------------------------

io.on ('connection', function (socket) {
  var re_addr = socket.request.connection.remoteAddress+':'+socket.request.connection.remotePort;
  var hndsh = socket.handshake, date = new Date ();
  //console.log ('-- Client '+re_addr+' connected ['+socket.nsp.name+'] on '+ date + ' --');
  //console.log ('   sockID='+socket.id+ '  cookies=', hndsh.headers.cookie);
  //console.log ('   Total server clients='+ socket.conn.server.clientsCount);
  console.log('pripojil sa klient');
  var player = new Player(id_player, 1, 1, socket.id);
  players.push(player);
  console.log(players);
  socket.emit('write_rooms', rooms);


  socket.on ('disconnect', function () {
    //console.log ('-- Client '+re_addr+' disconnected ['+socket.nsp.name+'] --');
    //console.log ('   Total server clients='+ socket.conn.server.clientsCount);
  });

  socket.on('make_room', function(meno){
    var room = new Room(meno, 15);
    rooms.push(room); 
    console.log('vytvorena miestnost s id '+ (pocet-1));

//----zmena miestnosti-----------------------------------------------
    for (var i = 0; i < players.length; i++) {
  		if (players[i].socket == socket.id){
  			if (players[i].room != -1){
  				var roomid = players[i].room;
  				rooms[roomid].num--;
  				rooms[roomid].matrix[players[i].x][players[i].y] = 1;
  			}
  			players[i].room = room.id;
  			rooms[room.id].num++;
  		} else { 
  			socket.emit('refresh', players, rooms);
  		} 
  	}
//----------------------------------------------------

  	socket.emit('enter_room', room.id, rooms);
    socket.emit('write_rooms', rooms);
    socket.broadcast.emit('write_rooms', rooms); 
     
  });

  socket.on('change_room', function(id){

//-----zmena miestnosti-------------------------------------
  	for (var i = 0; i < players.length; i++) {
  		if (players[i].socket == socket.id){
  			if (players[i].room != -1){
  				var roomid = players[i].room;
  				rooms[roomid].num--;
  				rooms[roomid].matrix[players[i].x][players[i].y] = 1;
  			}
  			players[i].room = id;
  			rooms[id].num++;
  		} else { 
  			socket.emit('refresh', players, rooms);
  		}
  	}
//--------------------------------------------------

    socket.emit('enter_room', id, rooms);
    socket.emit('write_rooms', rooms);
    socket.broadcast.emit('write_rooms', rooms); 
  });

  socket.on('move', function(xfrom, yfrom, xto, yto){

  	var roomid;

  	for (var i = 0; i < players.length; i++){
  		if (players[i].socket == socket.id){
  			roomid = players[i].room;
  			players[i].x = xto;
  			players[i].y = yto;
  		}
  	}

  	rooms[roomid].matrix[xfrom][yfrom] = 1;
  	rooms[roomid].matrix[xto][yto] = 2;

  	socket.broadcast.emit('refresh', players, rooms); 
    socket.emit('refresh', players, rooms);

  	//console.log(vypisMatrix(rooms[roomid].matrix));
  	//console.log(socket.id);
  	//console.log(xfrom, yfrom, xto, yto);

  });

  socket.on('initialize_position', function(x, y){
  	for (var i = 0; i < players.length; i++){
  		if (players[i].socket == socket.id){
  			roomid = players[i].room;
  			players[i].x = x;
  			players[i].y = y;
  		}
  	}	

  	rooms[roomid].matrix[x][y] = 2;

  	socket.broadcast.emit('refresh', players, rooms); 
    socket.emit('refresh', players, rooms);
  });



});
