
//Change this to true for a stretchy canvas!
//
var RESIZEABLE_CANVAS=false;

//Start us up!
//
window.onload=function( e ){

	if( RESIZEABLE_CANVAS ){
		window.onresize=function( e ){
			var canvas=document.getElementById( "GameCanvas" );

			//This vs window.innerWidth, which apparently doesn't account for scrollbar?
			var width=document.body.clientWidth;
			
			//This vs document.body.clientHeight, which does weird things - document seems to 'grow'...perhaps canvas resize pushing page down?
			var height=window.innerHeight;			

			canvas.width=width;
			canvas.height=height;
		}
		window.onresize( null );
	}
	
	game_canvas=document.getElementById( "GameCanvas" );
	
	game_console=document.getElementById( "GameConsole" );

	try{
	
		bbInit();
		bbMain();
		
		if( game_runner!=null ) game_runner();
		
	}catch( err ){
	
		alertError( err );
	}
}

var game_canvas;
var game_console;
var game_runner;

//${CONFIG_BEGIN}
CFG_BRL_GAMETARGET_IMPLEMENTED="1";
CFG_BRL_THREAD_IMPLEMENTED="1";
CFG_CONFIG="debug";
CFG_HOST="winnt";
CFG_LANG="js";
CFG_MOJO_DRIVER_IMPLEMENTED="1";
CFG_REFLECTION_FILTER="diddy.exception";
CFG_SAFEMODE="0";
CFG_TARGET="html5";
CFG_TEXT_FILES="*.txt|*.xml|*.json|*.tmx";
//${CONFIG_END}

//${METADATA_BEGIN}
var META_DATA="";
//${METADATA_END}

function getMetaData( path,key ){
	var i=META_DATA.indexOf( "["+path+"]" );
	if( i==-1 ) return "";
	i+=path.length+2;

	var e=META_DATA.indexOf( "\n",i );
	if( e==-1 ) e=META_DATA.length;

	i=META_DATA.indexOf( ";"+key+"=",i )
	if( i==-1 || i>=e ) return "";
	i+=key.length+2;

	e=META_DATA.indexOf( ";",i );
	if( e==-1 ) return "";

	return META_DATA.slice( i,e );
}

function loadString( path ){
	var xhr=new XMLHttpRequest();
	xhr.open( "GET","data/"+path,false );
	xhr.send( null );
	if( (xhr.status==200) || (xhr.status==0) ) return xhr.responseText;
	return "";
}

function loadImage( path,onloadfun ){
	var ty=getMetaData( path,"type" );
	if( ty.indexOf( "image/" )!=0 ) return null;

	var image=new Image();
	
	image.meta_width=parseInt( getMetaData( path,"width" ) );
	image.meta_height=parseInt( getMetaData( path,"height" ) );
	image.onload=onloadfun;
	image.src="data/"+path;
	
	return image;
}

function loadAudio( path ){
	var audio=new Audio( "data/"+path );
	return audio;
}

//${TRANSCODE_BEGIN}

// Javascript Monkey runtime.
//
// Placed into the public domain 24/02/2011.
// No warranty implied; use at your own risk.

//***** JavaScript Runtime *****

var D2R=0.017453292519943295;
var R2D=57.29577951308232;

var err_info="";
var err_stack=[];

var dbg_index=0;

function push_err(){
	err_stack.push( err_info );
}

function pop_err(){
	err_info=err_stack.pop();
}

function stackTrace(){
	if( !err_info.length ) return "";
	var str=err_info+"\n";
	for( var i=err_stack.length-1;i>0;--i ){
		str+=err_stack[i]+"\n";
	}
	return str;
}

function print( str ){
	var cons=document.getElementById( "GameConsole" );
	if( cons ){
		cons.value+=str+"\n";
		cons.scrollTop=cons.scrollHeight-cons.clientHeight;
	}else if( window.console!=undefined ){
		window.console.log( str );
	}
	return 0;
}

function alertError( err ){
	if( typeof(err)=="string" && err=="" ) return;
	alert( "Monkey Runtime Error : "+err.toString()+"\n\n"+stackTrace() );
}

function error( err ){
	throw err;
}

function debugLog( str ){
	if( window.console!=undefined ) window.console.log( str );
}

function debugStop(){
	debugger;	//	error( "STOP" );
}

function dbg_object( obj ){
	if( obj ) return obj;
	error( "Null object access" );
}

function dbg_charCodeAt( str,index ){
	if( index<0 || index>=str.length ) error( "Character index out of range" );
	return str.charCodeAt( index );
}

function dbg_array( arr,index ){
	if( index<0 || index>=arr.length ) error( "Array index out of range" );
	dbg_index=index;
	return arr;
}

function new_bool_array( len ){
	var arr=Array( len );
	for( var i=0;i<len;++i ) arr[i]=false;
	return arr;
}

function new_number_array( len ){
	var arr=Array( len );
	for( var i=0;i<len;++i ) arr[i]=0;
	return arr;
}

function new_string_array( len ){
	var arr=Array( len );
	for( var i=0;i<len;++i ) arr[i]='';
	return arr;
}

function new_array_array( len ){
	var arr=Array( len );
	for( var i=0;i<len;++i ) arr[i]=[];
	return arr;
}

function new_object_array( len ){
	var arr=Array( len );
	for( var i=0;i<len;++i ) arr[i]=null;
	return arr;
}

function resize_bool_array( arr,len ){
	var i=arr.length;
	arr=arr.slice(0,len);
	if( len<=i ) return arr;
	arr.length=len;
	while( i<len ) arr[i++]=false;
	return arr;
}

function resize_number_array( arr,len ){
	var i=arr.length;
	arr=arr.slice(0,len);
	if( len<=i ) return arr;
	arr.length=len;
	while( i<len ) arr[i++]=0;
	return arr;
}

function resize_string_array( arr,len ){
	var i=arr.length;
	arr=arr.slice(0,len);
	if( len<=i ) return arr;
	arr.length=len;
	while( i<len ) arr[i++]="";
	return arr;
}

function resize_array_array( arr,len ){
	var i=arr.length;
	arr=arr.slice(0,len);
	if( len<=i ) return arr;
	arr.length=len;
	while( i<len ) arr[i++]=[];
	return arr;
}

function resize_object_array( arr,len ){
	var i=arr.length;
	arr=arr.slice(0,len);
	if( len<=i ) return arr;
	arr.length=len;
	while( i<len ) arr[i++]=null;
	return arr;
}

function string_compare( lhs,rhs ){
	var n=Math.min( lhs.length,rhs.length ),i,t;
	for( i=0;i<n;++i ){
		t=lhs.charCodeAt(i)-rhs.charCodeAt(i);
		if( t ) return t;
	}
	return lhs.length-rhs.length;
}

function string_replace( str,find,rep ){	//no unregex replace all?!?
	var i=0;
	for(;;){
		i=str.indexOf( find,i );
		if( i==-1 ) return str;
		str=str.substring( 0,i )+rep+str.substring( i+find.length );
		i+=rep.length;
	}
}

function string_trim( str ){
	var i=0,i2=str.length;
	while( i<i2 && str.charCodeAt(i)<=32 ) i+=1;
	while( i2>i && str.charCodeAt(i2-1)<=32 ) i2-=1;
	return str.slice( i,i2 );
}

function string_startswith( str,substr ){
	return substr.length<=str.length && str.slice(0,substr.length)==substr;
}

function string_endswith( str,substr ){
	return substr.length<=str.length && str.slice(str.length-substr.length,str.length)==substr;
}

function string_tochars( str ){
	var arr=new Array( str.length );
	for( var i=0;i<str.length;++i ) arr[i]=str.charCodeAt(i);
	return arr;
}

function string_fromchars( chars ){
	var str="",i;
	for( i=0;i<chars.length;++i ){
		str+=String.fromCharCode( chars[i] );
	}
	return str;
}

function object_downcast( obj,clas ){
	if( obj instanceof clas ) return obj;
	return null;
}

function object_implements( obj,iface ){
	if( obj && obj.implments && obj.implments[iface] ) return obj;
	return null;
}

function extend_class( clas ){
	var tmp=function(){};
	tmp.prototype=clas.prototype;
	return new tmp;
}

function ThrowableObject(){
}

ThrowableObject.prototype.toString=function(){ 
	return "Uncaught Monkey Exception"; 
}


function BBGameEvent(){}
BBGameEvent.KeyDown=1;
BBGameEvent.KeyUp=2;
BBGameEvent.KeyChar=3;
BBGameEvent.MouseDown=4;
BBGameEvent.MouseUp=5;
BBGameEvent.MouseMove=6;
BBGameEvent.TouchDown=7;
BBGameEvent.TouchUp=8;
BBGameEvent.TouchMove=9;
BBGameEvent.MotionAccel=10;

function BBGameDelegate(){}
BBGameDelegate.prototype.StartGame=function(){}
BBGameDelegate.prototype.SuspendGame=function(){}
BBGameDelegate.prototype.ResumeGame=function(){}
BBGameDelegate.prototype.UpdateGame=function(){}
BBGameDelegate.prototype.RenderGame=function(){}
BBGameDelegate.prototype.KeyEvent=function( ev,data ){}
BBGameDelegate.prototype.MouseEvent=function( ev,data,x,y ){}
BBGameDelegate.prototype.TouchEvent=function( ev,data,x,y ){}
BBGameDelegate.prototype.MotionEvent=function( ev,data,x,y,z ){}
BBGameDelegate.prototype.DiscardGraphics=function(){}

function BBGame(){
	BBGame._game=this;
	this._delegate=null;
	this._keyboardEnabled=false;
	this._updateRate=0;
	this._started=false;
	this._suspended=false;
	this._debugExs=(CFG_CONFIG=="debug");
	this._startms=Date.now();
}

BBGame.Game=function(){
	return BBGame._game;
}

BBGame.prototype.SetDelegate=function( delegate ){
	this._delegate=delegate;
}

BBGame.prototype.Delegate=function(){
	return this._delegate;
}

BBGame.prototype.SetUpdateRate=function( updateRate ){
	this._updateRate=updateRate;
}

BBGame.prototype.SetKeyboardEnabled=function( keyboardEnabled ){
	this._keyboardEnabled=keyboardEnabled;
}

BBGame.prototype.Started=function(){
	return this._started;
}

BBGame.prototype.Suspended=function(){
	return this._suspended;
}

BBGame.prototype.Millisecs=function(){
	return Date.now()-this._startms;
}

BBGame.prototype.GetDate=function( date ){
	var n=date.length;
	if( n>0 ){
		var t=new Date();
		date[0]=t.getFullYear();
		if( n>1 ){
			date[1]=t.getMonth()+1;
			if( n>2 ){
				date[2]=t.getDate();
				if( n>3 ){
					date[3]=t.getHours();
					if( n>4 ){
						date[4]=t.getMinutes();
						if( n>5 ){
							date[5]=t.getSeconds();
							if( n>6 ){
								date[6]=t.getMilliseconds();
							}
						}
					}
				}
			}
		}
	}
}

BBGame.prototype.SaveState=function( state ){
	localStorage.setItem( "monkeystate@"+document.URL,state );	//key can't start with dot in Chrome!
	return 1;
}

BBGame.prototype.LoadState=function(){
	var state=localStorage.getItem( "monkeystate@"+document.URL );
	if( state ) return state;
	return "";
}

BBGame.prototype.LoadString=function( path ){

	var xhr=new XMLHttpRequest();
	xhr.open( "GET",this.PathToUrl( path ),false );
	
	xhr.send( null );
	
	if( xhr.status==200 || xhr.status==0 ) return xhr.responseText;
	
	return "";
}

BBGame.prototype.PollJoystick=function( port,joyx,joyy,joyz,buttons ){
	return false;
}

BBGame.prototype.OpenUrl=function( url ){
	window.location=url;
}

BBGame.prototype.SetMouseVisible=function( visible ){
	if( visible ){
		this._canvas.style.cursor='default';	
	}else{
		this._canvas.style.cursor="url('data:image/cur;base64,AAACAAEAICAAAAAAAACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA55ZXBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOeWVxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADnllcGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9////////////////////+////////f/////////8%3D'), auto";
	}
}

BBGame.prototype.PathToFilePath=function( path ){
	return "";
}

//***** js Game *****

BBGame.prototype.PathToUrl=function( path ){
	return path;
}

BBGame.prototype.LoadData=function( path ){

	var xhr=new XMLHttpRequest();
	xhr.open( "GET",this.PathToUrl( path ),false );

	if( xhr.overrideMimeType ) xhr.overrideMimeType( "text/plain; charset=x-user-defined" );

	xhr.send( null );
	if( xhr.status!=200 && xhr.status!=0 ) return null;

	var r=xhr.responseText;
	var buf=new ArrayBuffer( r.length );
	var bytes=new Int8Array( buf );
	for( var i=0;i<r.length;++i ){
		bytes[i]=r.charCodeAt( i );
	}
	return buf;
}

//***** INTERNAL ******

BBGame.prototype.Die=function( ex ){

	this._delegate=new BBGameDelegate();
	
	if( !ex.toString() ){
		return;
	}
	
	if( this._debugExs ){
		print( "Monkey Runtime Error : "+ex.toString() );
		print( stackTrace() );
	}
	
	throw ex;
}

BBGame.prototype.StartGame=function(){

	if( this._started ) return;
	this._started=true;
	
	if( this._debugExs ){
		try{
			this._delegate.StartGame();
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.StartGame();
	}
}

BBGame.prototype.SuspendGame=function(){

	if( !this._started || this._suspended ) return;
	this._suspended=true;
	
	if( this._debugExs ){
		try{
			this._delegate.SuspendGame();
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.SuspendGame();
	}
}

BBGame.prototype.ResumeGame=function(){

	if( !this._started || !this._suspended ) return;
	this._suspended=false;
	
	if( this._debugExs ){
		try{
			this._delegate.ResumeGame();
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.ResumeGame();
	}
}

BBGame.prototype.UpdateGame=function(){

	if( !this._started || this._suspended ) return;

	if( this._debugExs ){
		try{
			this._delegate.UpdateGame();
		}catch( ex ){
			this.Die( ex );
		}	
	}else{
		this._delegate.UpdateGame();
	}
}

BBGame.prototype.RenderGame=function(){

	if( !this._started ) return;
	
	if( this._debugExs ){
		try{
			this._delegate.RenderGame();
		}catch( ex ){
			this.Die( ex );
		}	
	}else{
		this._delegate.RenderGame();
	}
}

BBGame.prototype.KeyEvent=function( ev,data ){

	if( !this._started ) return;
	
	if( this._debugExs ){
		try{
			this._delegate.KeyEvent( ev,data );
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.KeyEvent( ev,data );
	}
}

BBGame.prototype.MouseEvent=function( ev,data,x,y ){

	if( !this._started ) return;
	
	if( this._debugExs ){
		try{
			this._delegate.MouseEvent( ev,data,x,y );
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.MouseEvent( ev,data,x,y );
	}
}

BBGame.prototype.TouchEvent=function( ev,data,x,y ){

	if( !this._started ) return;
	
	if( this._debugExs ){
		try{
			this._delegate.TouchEvent( ev,data,x,y );
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.TouchEvent( ev,data,x,y );
	}
}

BBGame.prototype.MotionEvent=function( ev,data,x,y,z ){

	if( !this._started ) return;
	
	if( this._debugExs ){
		try{
			this._delegate.MotionEvent( ev,data,x,y,z );
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.MotionEvent( ev,data,x,y,z );
	}
}

BBGame.prototype.DiscardGraphics=function(){

	if( !this._started ) return;
	
	if( this._debugExs ){
		try{
			this._delegate.DiscardGraphics();
		}catch( ex ){
			this.Die( ex );
		}
	}else{
		this._delegate.DiscardGraphics();
	}
}


function BBHtml5Game( canvas ){
	BBGame.call( this );
	BBHtml5Game._game=this;
	this._canvas=canvas;
	this._loading=0;
	this._timerSeq=0;
	this._gl=null;
	if( CFG_OPENGL_GLES20_ENABLED=="1" ){
		this._gl=this._canvas.getContext( "webgl" );
		if( !this._gl ) this._gl=this._canvas.getContext( "experimental-webgl" );
		if( !this._gl ) this.Die( "Can't create WebGL" );
		gl=this._gl;
	}
}

BBHtml5Game.prototype=extend_class( BBGame );

BBHtml5Game.Html5Game=function(){
	return BBHtml5Game._game;
}

BBHtml5Game.prototype.ValidateUpdateTimer=function(){

	++this._timerSeq;

	if( !this._updateRate || this._suspended ) return;
	
	var game=this;
	var updatePeriod=1000.0/this._updateRate;
	var nextUpdate=Date.now()+updatePeriod;
	var seq=game._timerSeq;
	
	function timeElapsed(){
		if( seq!=game._timerSeq ) return;

		var time;		
		var updates;
		
		for( updates=0;updates<4;++updates ){
		
			nextUpdate+=updatePeriod;
			
			game.UpdateGame();
			if( seq!=game._timerSeq ) return;
			
			if( nextUpdate-Date.now()>0 ) break;
		}
		
		game.RenderGame();
		if( seq!=game._timerSeq ) return;
		
		if( updates==4 ){
			nextUpdate=Date.now();
			setTimeout( timeElapsed,0 );
		}else{
			var delay=nextUpdate-Date.now();
			setTimeout( timeElapsed,delay>0 ? delay : 0 );
		}
	}

	setTimeout( timeElapsed,updatePeriod );
}

//***** BBGame methods *****

BBHtml5Game.prototype.SetUpdateRate=function( updateRate ){

	BBGame.prototype.SetUpdateRate.call( this,updateRate );
	
	this.ValidateUpdateTimer();
}

BBHtml5Game.prototype.GetMetaData=function( path,key ){
	if( path.indexOf( "monkey://data/" )!=0 ) return "";
	path=path.slice(14);

	var i=META_DATA.indexOf( "["+path+"]" );
	if( i==-1 ) return "";
	i+=path.length+2;

	var e=META_DATA.indexOf( "\n",i );
	if( e==-1 ) e=META_DATA.length;

	i=META_DATA.indexOf( ";"+key+"=",i )
	if( i==-1 || i>=e ) return "";
	i+=key.length+2;

	e=META_DATA.indexOf( ";",i );
	if( e==-1 ) return "";

	return META_DATA.slice( i,e );
}

BBHtml5Game.prototype.PathToUrl=function( path ){
	if( path.indexOf( "monkey:" )!=0 ){
		return path;
	}else if( path.indexOf( "monkey://data/" )==0 ) {
		return "data/"+path.slice( 14 );
	}
	return "";
}

BBHtml5Game.prototype.GetLoading=function(){
	return this._loading;
}

BBHtml5Game.prototype.IncLoading=function(){
	++this._loading;
	return this._loading;
}

BBHtml5Game.prototype.DecLoading=function(){
	--this._loading;
	return this._loading;
}

BBHtml5Game.prototype.GetCanvas=function(){
	return this._canvas;
}

BBHtml5Game.prototype.GetWebGL=function(){
	return this._gl;
}

//***** INTERNAL *****

BBHtml5Game.prototype.UpdateGame=function(){

	if( !this._loading ) BBGame.prototype.UpdateGame.call( this );
}

BBHtml5Game.prototype.SuspendGame=function(){

	BBGame.prototype.SuspendGame.call( this );
	
	BBGame.prototype.RenderGame.call( this );
	
	this.ValidateUpdateTimer();
}

BBHtml5Game.prototype.ResumeGame=function(){

	BBGame.prototype.ResumeGame.call( this );
	
	this.ValidateUpdateTimer();
}

BBHtml5Game.prototype.Run=function(){

	var game=this;
	var canvas=game._canvas;
	
	var touchIds=new Array( 32 );
	for( i=0;i<32;++i ) touchIds[i]=-1;
	
	function eatEvent( e ){
		if( e.stopPropagation ){
			e.stopPropagation();
			e.preventDefault();
		}else{
			e.cancelBubble=true;
			e.returnValue=false;
		}
	}
	
	function keyToChar( key ){
		switch( key ){
		case 8:case 9:case 13:case 27:case 32:return key;
		case 33:case 34:case 35:case 36:case 37:case 38:case 39:case 40:case 45:return key|0x10000;
		case 46:return 127;
		}
		return 0;
	}
	
	function mouseX( e ){
		var x=e.clientX+document.body.scrollLeft;
		var c=canvas;
		while( c ){
			x-=c.offsetLeft;
			c=c.offsetParent;
		}
		return x;
	}
	
	function mouseY( e ){
		var y=e.clientY+document.body.scrollTop;
		var c=canvas;
		while( c ){
			y-=c.offsetTop;
			c=c.offsetParent;
		}
		return y;
	}

	function touchX( touch ){
		var x=touch.pageX;
		var c=canvas;
		while( c ){
			x-=c.offsetLeft;
			c=c.offsetParent;
		}
		return x;
	}			
	
	function touchY( touch ){
		var y=touch.pageY;
		var c=canvas;
		while( c ){
			y-=c.offsetTop;
			c=c.offsetParent;
		}
		return y;
	}
	
	canvas.onkeydown=function( e ){
		game.KeyEvent( BBGameEvent.KeyDown,e.keyCode );
		var chr=keyToChar( e.keyCode );
		if( chr ) game.KeyEvent( BBGameEvent.KeyChar,chr );
		if( e.keyCode<48 || (e.keyCode>111 && e.keyCode<122) ) eatEvent( e );
	}

	canvas.onkeyup=function( e ){
		game.KeyEvent( BBGameEvent.KeyUp,e.keyCode );
	}

	canvas.onkeypress=function( e ){
		if( e.charCode ){
			game.KeyEvent( BBGameEvent.KeyChar,e.charCode );
		}else if( e.which ){
			game.KeyEvent( BBGameEvent.KeyChar,e.which );
		}
	}

	canvas.onmousedown=function( e ){
		switch( e.button ){
		case 0:game.MouseEvent( BBGameEvent.MouseDown,0,mouseX(e),mouseY(e) );break;
		case 1:game.MouseEvent( BBGameEvent.MouseDown,2,mouseX(e),mouseY(e) );break;
		case 2:game.MouseEvent( BBGameEvent.MouseDown,1,mouseX(e),mouseY(e) );break;
		}
		eatEvent( e );
	}
	
	canvas.onmouseup=function( e ){
		switch( e.button ){
		case 0:game.MouseEvent( BBGameEvent.MouseUp,0,mouseX(e),mouseY(e) );break;
		case 1:game.MouseEvent( BBGameEvent.MouseUp,2,mouseX(e),mouseY(e) );break;
		case 2:game.MouseEvent( BBGameEvent.MouseUp,1,mouseX(e),mouseY(e) );break;
		}
		eatEvent( e );
	}
	
	canvas.onmousemove=function( e ){
		game.MouseEvent( BBGameEvent.MouseMove,-1,mouseX(e),mouseY(e) );
		eatEvent( e );
	}

	canvas.onmouseout=function( e ){
		game.MouseEvent( BBGameEvent.MouseUp,0,mouseX(e),mouseY(e) );
		game.MouseEvent( BBGameEvent.MouseUp,1,mouseX(e),mouseY(e) );
		game.MouseEvent( BBGameEvent.MouseUp,2,mouseX(e),mouseY(e) );
		eatEvent( e );
	}
	
	canvas.onclick=function( e ){
		if( game.Suspended() ){
			canvas.focus();
		}
		eatEvent( e );
		return;
	}
	
	canvas.oncontextmenu=function( e ){
		return false;
	}
	
	canvas.ontouchstart=function( e ){
		if( game.Suspended() ){
			canvas.focus();
		}
		for( var i=0;i<e.changedTouches.length;++i ){
			var touch=e.changedTouches[i];
			for( var j=0;j<32;++j ){
				if( touchIds[j]!=-1 ) continue;
				touchIds[j]=touch.identifier;
				game.TouchEvent( BBGameEvent.TouchDown,j,touchX(touch),touchY(touch) );
				break;
			}
		}
		eatEvent( e );
	}
	
	canvas.ontouchmove=function( e ){
		for( var i=0;i<e.changedTouches.length;++i ){
			var touch=e.changedTouches[i];
			for( var j=0;j<32;++j ){
				if( touchIds[j]!=touch.identifier ) continue;
				game.TouchEvent( BBGameEvent.TouchMove,j,touchX(touch),touchY(touch) );
				break;
			}
		}
		eatEvent( e );
	}
	
	canvas.ontouchend=function( e ){
		for( var i=0;i<e.changedTouches.length;++i ){
			var touch=e.changedTouches[i];
			for( var j=0;j<32;++j ){
				if( touchIds[j]!=touch.identifier ) continue;
				touchIds[j]=-1;
				game.TouchEvent( BBGameEvent.TouchUp,j,touchX(touch),touchY(touch) );
				break;
			}
		}
		eatEvent( e );
	}
	
	window.ondevicemotion=function( e ){
		var tx=e.accelerationIncludingGravity.x/9.81;
		var ty=e.accelerationIncludingGravity.y/9.81;
		var tz=e.accelerationIncludingGravity.z/9.81;
		var x,y;
		switch( window.orientation ){
		case   0:x=+tx;y=-ty;break;
		case 180:x=-tx;y=+ty;break;
		case  90:x=-ty;y=-tx;break;
		case -90:x=+ty;y=+tx;break;
		}
		game.MotionEvent( BBGameEvent.MotionAccel,0,x,y,tz );
		eatEvent( e );
	}

	canvas.onfocus=function( e ){
		if( CFG_MOJO_AUTO_SUSPEND_ENABLED=="1" ){
			game.ResumeGame();
		}
	}
	
	canvas.onblur=function( e ){
		for( var i=0;i<256;++i ) game.KeyEvent( BBGameEvent.KeyUp,i );
		if( CFG_MOJO_AUTO_SUSPEND_ENABLED=="1" ){
			game.SuspendGame();
		}
	}
	
	canvas.focus();
	
	game.StartGame();

	game.RenderGame();
}


function BBMonkeyGame( canvas ){
	BBHtml5Game.call( this,canvas );
}

BBMonkeyGame.prototype=extend_class( BBHtml5Game );

BBMonkeyGame.Main=function( canvas ){

	var game=new BBMonkeyGame( canvas );

	try{

		bbInit();
		bbMain();

	}catch( ex ){
	
		game.Die( ex );
		return;
	}

	if( !game.Delegate() ) return;
	
	game.Run();
}


// HTML5 mojo runtime.
//
// Copyright 2011 Mark Sibly, all rights reserved.
// No warranty implied; use at your own risk.

//***** gxtkGraphics class *****

function gxtkGraphics(){
	this.game=BBHtml5Game.Html5Game();
	this.canvas=this.game.GetCanvas()
	this.width=this.canvas.width;
	this.height=this.canvas.height;
	this.gl=null;
	this.gc=this.canvas.getContext( '2d' );
	this.tmpCanvas=null;
	this.r=255;
	this.b=255;
	this.g=255;
	this.white=true;
	this.color="rgb(255,255,255)"
	this.alpha=1;
	this.blend="source-over";
	this.ix=1;this.iy=0;
	this.jx=0;this.jy=1;
	this.tx=0;this.ty=0;
	this.tformed=false;
	this.scissorX=0;
	this.scissorY=0;
	this.scissorWidth=0;
	this.scissorHeight=0;
	this.clipped=false;
}

gxtkGraphics.prototype.BeginRender=function(){
	this.width=this.canvas.width;
	this.height=this.canvas.height;
	if( !this.gc ) return 0;
	this.gc.save();
	if( this.game.GetLoading() ) return 2;
	return 1;
}

gxtkGraphics.prototype.EndRender=function(){
	if( this.gc ) this.gc.restore();
}

gxtkGraphics.prototype.Width=function(){
	return this.width;
}

gxtkGraphics.prototype.Height=function(){
	return this.height;
}

gxtkGraphics.prototype.LoadSurface=function( path ){
	var game=this.game;

	var ty=game.GetMetaData( path,"type" );
	if( ty.indexOf( "image/" )!=0 ) return null;
	
	function onloadfun(){
		game.DecLoading();
	}
	
	game.IncLoading();

	var image=new Image();
	image.onload=onloadfun;
	image.meta_width=parseInt( game.GetMetaData( path,"width" ) );
	image.meta_height=parseInt( game.GetMetaData( path,"height" ) );
	image.src=game.PathToUrl( path );

	return new gxtkSurface( image,this );
}

gxtkGraphics.prototype.CreateSurface=function( width,height ){
	var canvas=document.createElement( 'canvas' );
	
	canvas.width=width;
	canvas.height=height;
	canvas.meta_width=width;
	canvas.meta_height=height;
	canvas.complete=true;
	
	var surface=new gxtkSurface( canvas,this );
	
	surface.gc=canvas.getContext( '2d' );
	
	return surface;
}

gxtkGraphics.prototype.SetAlpha=function( alpha ){
	this.alpha=alpha;
	this.gc.globalAlpha=alpha;
}

gxtkGraphics.prototype.SetColor=function( r,g,b ){
	this.r=r;
	this.g=g;
	this.b=b;
	this.white=(r==255 && g==255 && b==255);
	this.color="rgb("+(r|0)+","+(g|0)+","+(b|0)+")";
	this.gc.fillStyle=this.color;
	this.gc.strokeStyle=this.color;
}

gxtkGraphics.prototype.SetBlend=function( blend ){
	switch( blend ){
	case 1:
		this.blend="lighter";
		break;
	default:
		this.blend="source-over";
	}
	this.gc.globalCompositeOperation=this.blend;
}

gxtkGraphics.prototype.SetScissor=function( x,y,w,h ){
	this.scissorX=x;
	this.scissorY=y;
	this.scissorWidth=w;
	this.scissorHeight=h;
	this.clipped=(x!=0 || y!=0 || w!=this.canvas.width || h!=this.canvas.height);
	this.gc.restore();
	this.gc.save();
	if( this.clipped ){
		this.gc.beginPath();
		this.gc.rect( x,y,w,h );
		this.gc.clip();
		this.gc.closePath();
	}
	this.gc.fillStyle=this.color;
	this.gc.strokeStyle=this.color;	
	this.gc.globalAlpha=this.alpha;	
	this.gc.globalCompositeOperation=this.blend;
	if( this.tformed ) this.gc.setTransform( this.ix,this.iy,this.jx,this.jy,this.tx,this.ty );
}

gxtkGraphics.prototype.SetMatrix=function( ix,iy,jx,jy,tx,ty ){
	this.ix=ix;this.iy=iy;
	this.jx=jx;this.jy=jy;
	this.tx=tx;this.ty=ty;
	this.gc.setTransform( ix,iy,jx,jy,tx,ty );
	this.tformed=(ix!=1 || iy!=0 || jx!=0 || jy!=1 || tx!=0 || ty!=0);
}

gxtkGraphics.prototype.Cls=function( r,g,b ){
	if( this.tformed ) this.gc.setTransform( 1,0,0,1,0,0 );
	this.gc.fillStyle="rgb("+(r|0)+","+(g|0)+","+(b|0)+")";
	this.gc.globalAlpha=1;
	this.gc.globalCompositeOperation="source-over";
	this.gc.fillRect( 0,0,this.canvas.width,this.canvas.height );
	this.gc.fillStyle=this.color;
	this.gc.globalAlpha=this.alpha;
	this.gc.globalCompositeOperation=this.blend;
	if( this.tformed ) this.gc.setTransform( this.ix,this.iy,this.jx,this.jy,this.tx,this.ty );
}

gxtkGraphics.prototype.DrawPoint=function( x,y ){
	if( this.tformed ){
		var px=x;
		x=px * this.ix + y * this.jx + this.tx;
		y=px * this.iy + y * this.jy + this.ty;
		this.gc.setTransform( 1,0,0,1,0,0 );
		this.gc.fillRect( x,y,1,1 );
		this.gc.setTransform( this.ix,this.iy,this.jx,this.jy,this.tx,this.ty );
	}else{
		this.gc.fillRect( x,y,1,1 );
	}
}

gxtkGraphics.prototype.DrawRect=function( x,y,w,h ){
	if( w<0 ){ x+=w;w=-w; }
	if( h<0 ){ y+=h;h=-h; }
	if( w<=0 || h<=0 ) return;
	//
	this.gc.fillRect( x,y,w,h );
}

gxtkGraphics.prototype.DrawLine=function( x1,y1,x2,y2 ){
	if( this.tformed ){
		var x1_t=x1 * this.ix + y1 * this.jx + this.tx;
		var y1_t=x1 * this.iy + y1 * this.jy + this.ty;
		var x2_t=x2 * this.ix + y2 * this.jx + this.tx;
		var y2_t=x2 * this.iy + y2 * this.jy + this.ty;
		this.gc.setTransform( 1,0,0,1,0,0 );
	  	this.gc.beginPath();
	  	this.gc.moveTo( x1_t,y1_t );
	  	this.gc.lineTo( x2_t,y2_t );
	  	this.gc.stroke();
	  	this.gc.closePath();
		this.gc.setTransform( this.ix,this.iy,this.jx,this.jy,this.tx,this.ty );
	}else{
	  	this.gc.beginPath();
	  	this.gc.moveTo( x1,y1 );
	  	this.gc.lineTo( x2,y2 );
	  	this.gc.stroke();
	  	this.gc.closePath();
	}
}

gxtkGraphics.prototype.DrawOval=function( x,y,w,h ){
	if( w<0 ){ x+=w;w=-w; }
	if( h<0 ){ y+=h;h=-h; }
	if( w<=0 || h<=0 ) return;
	//
  	var w2=w/2,h2=h/2;
	this.gc.save();
	this.gc.translate( x+w2,y+h2 );
	this.gc.scale( w2,h2 );
  	this.gc.beginPath();
	this.gc.arc( 0,0,1,0,Math.PI*2,false );
	this.gc.fill();
  	this.gc.closePath();
	this.gc.restore();
}

gxtkGraphics.prototype.DrawPoly=function( verts ){
	if( verts.length<2 ) return;
	this.gc.beginPath();
	this.gc.moveTo( verts[0],verts[1] );
	for( var i=2;i<verts.length;i+=2 ){
		this.gc.lineTo( verts[i],verts[i+1] );
	}
	this.gc.fill();
	this.gc.closePath();
}

gxtkGraphics.prototype.DrawPoly2=function( verts,surface,srx,srcy ){
	if( verts.length<4 ) return;
	this.gc.beginPath();
	this.gc.moveTo( verts[0],verts[1] );
	for( var i=4;i<verts.length;i+=4 ){
		this.gc.lineTo( verts[i],verts[i+1] );
	}
	this.gc.fill();
	this.gc.closePath();
}

gxtkGraphics.prototype.DrawSurface=function( surface,x,y ){
	if( !surface.image.complete ) return;
	
	if( this.white ){
		this.gc.drawImage( surface.image,x,y );
		return;
	}
	
	this.DrawImageTinted( surface.image,x,y,0,0,surface.swidth,surface.sheight );
}

gxtkGraphics.prototype.DrawSurface2=function( surface,x,y,srcx,srcy,srcw,srch ){
	if( !surface.image.complete ) return;

	if( srcw<0 ){ srcx+=srcw;srcw=-srcw; }
	if( srch<0 ){ srcy+=srch;srch=-srch; }
	if( srcw<=0 || srch<=0 ) return;

	if( this.white ){
		this.gc.drawImage( surface.image,srcx,srcy,srcw,srch,x,y,srcw,srch );
		return;
	}
	
	this.DrawImageTinted( surface.image,x,y,srcx,srcy,srcw,srch  );
}

gxtkGraphics.prototype.DrawImageTinted=function( image,dx,dy,sx,sy,sw,sh ){

	if( !this.tmpCanvas ){
		this.tmpCanvas=document.createElement( "canvas" );
	}

	if( sw>this.tmpCanvas.width || sh>this.tmpCanvas.height ){
		this.tmpCanvas.width=Math.max( sw,this.tmpCanvas.width );
		this.tmpCanvas.height=Math.max( sh,this.tmpCanvas.height );
	}
	
	var tmpGC=this.tmpCanvas.getContext( "2d" );
	tmpGC.globalCompositeOperation="copy";
	
	tmpGC.drawImage( image,sx,sy,sw,sh,0,0,sw,sh );
	
	var imgData=tmpGC.getImageData( 0,0,sw,sh );
	
	var p=imgData.data,sz=sw*sh*4,i;
	
	for( i=0;i<sz;i+=4 ){
		p[i]=p[i]*this.r/255;
		p[i+1]=p[i+1]*this.g/255;
		p[i+2]=p[i+2]*this.b/255;
	}
	
	tmpGC.putImageData( imgData,0,0 );
	
	this.gc.drawImage( this.tmpCanvas,0,0,sw,sh,dx,dy,sw,sh );
}

gxtkGraphics.prototype.ReadPixels=function( pixels,x,y,width,height,offset,pitch ){

	var imgData=this.gc.getImageData( x,y,width,height );
	
	var p=imgData.data,i=0,j=offset,px,py;
	
	for( py=0;py<height;++py ){
		for( px=0;px<width;++px ){
			pixels[j++]=(p[i+3]<<24)|(p[i]<<16)|(p[i+1]<<8)|p[i+2];
			i+=4;
		}
		j+=pitch-width;
	}
}

gxtkGraphics.prototype.WritePixels2=function( surface,pixels,x,y,width,height,offset,pitch ){

	if( !surface.gc ){
		if( !surface.image.complete ) return;
		var canvas=document.createElement( "canvas" );
		canvas.width=surface.swidth;
		canvas.height=surface.sheight;
		surface.gc=canvas.getContext( "2d" );
		surface.gc.globalCompositeOperation="copy";
		surface.gc.drawImage( surface.image,0,0 );
		surface.image=canvas;
	}

	var imgData=surface.gc.createImageData( width,height );

	var p=imgData.data,i=0,j=offset,px,py,argb;
	
	for( py=0;py<height;++py ){
		for( px=0;px<width;++px ){
			argb=pixels[j++];
			p[i]=(argb>>16) & 0xff;
			p[i+1]=(argb>>8) & 0xff;
			p[i+2]=argb & 0xff;
			p[i+3]=(argb>>24) & 0xff;
			i+=4;
		}
		j+=pitch-width;
	}
	
	surface.gc.putImageData( imgData,x,y );
}

//***** gxtkSurface class *****

function gxtkSurface( image,graphics ){
	this.image=image;
	this.graphics=graphics;
	this.swidth=image.meta_width;
	this.sheight=image.meta_height;
}

//***** GXTK API *****

gxtkSurface.prototype.Discard=function(){
	if( this.image ){
		this.image=null;
	}
}

gxtkSurface.prototype.Width=function(){
	return this.swidth;
}

gxtkSurface.prototype.Height=function(){
	return this.sheight;
}

gxtkSurface.prototype.Loaded=function(){
	return this.image.complete;
}

gxtkSurface.prototype.OnUnsafeLoadComplete=function(){
	return true;
}

//***** gxtkChannel class *****
function gxtkChannel(){
	this.sample=null;
	this.audio=null;
	this.volume=1;
	this.pan=0;
	this.rate=1;
	this.flags=0;
	this.state=0;
}

//***** gxtkAudio class *****
function gxtkAudio(){
	this.game=BBHtml5Game.Html5Game();
	this.okay=typeof(Audio)!="undefined";
	this.music=null;
	this.channels=new Array(33);
	for( var i=0;i<33;++i ){
		this.channels[i]=new gxtkChannel();
		if( !this.okay ) this.channels[i].state=-1;
	}
}

gxtkAudio.prototype.Suspend=function(){
	var i;
	for( i=0;i<33;++i ){
		var chan=this.channels[i];
		if( chan.state==1 ){
			if( chan.audio.ended && !chan.audio.loop ){
				chan.state=0;
			}else{
				chan.audio.pause();
				chan.state=3;
			}
		}
	}
}

gxtkAudio.prototype.Resume=function(){
	var i;
	for( i=0;i<33;++i ){
		var chan=this.channels[i];
		if( chan.state==3 ){
			chan.audio.play();
			chan.state=1;
		}
	}
}

gxtkAudio.prototype.LoadSample=function( path ){
	if( !this.okay ) return null;

	var audio=new Audio( this.game.PathToUrl( path ) );
	if( !audio ) return null;
	
	return new gxtkSample( audio );
}

gxtkAudio.prototype.PlaySample=function( sample,channel,flags ){
	if( !this.okay ) return;
	
	var chan=this.channels[channel];

	if( chan.state>0 ){
		chan.audio.pause();
		chan.state=0;
	}
	
	for( var i=0;i<33;++i ){
		var chan2=this.channels[i];
		if( chan2.state==1 && chan2.audio.ended && !chan2.audio.loop ) chan.state=0;
		if( chan2.state==0 && chan2.sample ){
			chan2.sample.FreeAudio( chan2.audio );
			chan2.sample=null;
			chan2.audio=null;
		}
	}

	var audio=sample.AllocAudio();
	if( !audio ) return;

	audio.loop=(flags&1)!=0;
	audio.volume=chan.volume;
	audio.play();

	chan.sample=sample;
	chan.audio=audio;
	chan.flags=flags;
	chan.state=1;
}

gxtkAudio.prototype.StopChannel=function( channel ){
	var chan=this.channels[channel];
	
	if( chan.state>0 ){
		chan.audio.pause();
		chan.state=0;
	}
}

gxtkAudio.prototype.PauseChannel=function( channel ){
	var chan=this.channels[channel];
	
	if( chan.state==1 ){
		if( chan.audio.ended && !chan.audio.loop ){
			chan.state=0;
		}else{
			chan.audio.pause();
			chan.state=2;
		}
	}
}

gxtkAudio.prototype.ResumeChannel=function( channel ){
	var chan=this.channels[channel];
	
	if( chan.state==2 ){
		chan.audio.play();
		chan.state=1;
	}
}

gxtkAudio.prototype.ChannelState=function( channel ){
	var chan=this.channels[channel];
	if( chan.state==1 && chan.audio.ended && !chan.audio.loop ) chan.state=0;
	if( chan.state==3 ) return 1;
	return chan.state;
}

gxtkAudio.prototype.SetVolume=function( channel,volume ){
	var chan=this.channels[channel];
	if( chan.state>0 ) chan.audio.volume=volume;
	chan.volume=volume;
}

gxtkAudio.prototype.SetPan=function( channel,pan ){
	var chan=this.channels[channel];
	chan.pan=pan;
}

gxtkAudio.prototype.SetRate=function( channel,rate ){
	var chan=this.channels[channel];
	chan.rate=rate;
}

gxtkAudio.prototype.PlayMusic=function( path,flags ){
	this.StopMusic();
	
	this.music=this.LoadSample( path );
	if( !this.music ) return;
	
	this.PlaySample( this.music,32,flags );
}

gxtkAudio.prototype.StopMusic=function(){
	this.StopChannel( 32 );

	if( this.music ){
		this.music.Discard();
		this.music=null;
	}
}

gxtkAudio.prototype.PauseMusic=function(){
	this.PauseChannel( 32 );
}

gxtkAudio.prototype.ResumeMusic=function(){
	this.ResumeChannel( 32 );
}

gxtkAudio.prototype.MusicState=function(){
	return this.ChannelState( 32 );
}

gxtkAudio.prototype.SetMusicVolume=function( volume ){
	this.SetVolume( 32,volume );
}

//***** gxtkSample class *****

function gxtkSample( audio ){
	this.audio=audio;
	this.free=new Array();
	this.insts=new Array();
}

gxtkSample.prototype.FreeAudio=function( audio ){
	this.free.push( audio );
}

gxtkSample.prototype.AllocAudio=function(){
	var audio;
	while( this.free.length ){
		audio=this.free.pop();
		try{
			audio.currentTime=0;
			return audio;
		}catch( ex ){
			print( "AUDIO ERROR1!" );
		}
	}
	
	//Max out?
	if( this.insts.length==8 ) return null;
	
	audio=new Audio( this.audio.src );
	
	//yucky loop handler for firefox!
	//
	audio.addEventListener( 'ended',function(){
		if( this.loop ){
			try{
				this.currentTime=0;
				this.play();
			}catch( ex ){
				print( "AUDIO ERROR2!" );
			}
		}
	},false );

	this.insts.push( audio );
	return audio;
}

gxtkSample.prototype.Discard=function(){
}


function BBThread(){
	this.result=null;
	this.running=false;
}

BBThread.prototype.Start=function(){
	this.result=null;
	this.running=true;
	this.Run__UNSAFE__();
}

BBThread.prototype.IsRunning=function(){
	return this.running;
}

BBThread.prototype.Result=function(){
	return this.result;
}

BBThread.prototype.Run__UNSAFE__=function(){
	this.running=false;
}


function BBAsyncImageLoaderThread(){
	this._running=false;
}

BBAsyncImageLoaderThread.prototype.Start=function(){

	var thread=this;
	var image=new Image();

	image.onload=function( e ){
		image.meta_width=image.width;
		image.meta_height=image.height;
		thread._surface=new gxtkSurface( image,thread._device )
		thread._running=false;
	}
	
	image.onerror=function( e ){
		thread._surface=null;
		thread._running=false;
	}
	
	thread._running=true;
	
	image.src=BBGame.Game().PathToUrl( thread._path );
}

BBAsyncImageLoaderThread.prototype.IsRunning=function(){
	return this._running;
}



function BBAsyncSoundLoaderThread(){
}

BBAsyncSoundLoaderThread.prototype.Start=function(){
	this._sample=this._device.LoadSample( this._path );
}

BBAsyncSoundLoaderThread.prototype.IsRunning=function(){
	return false;
}

/*
Copyright (c) 2011 Steve Revill and Shane Woolcock
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var diddy = new Object();

var diddy_mouseWheelDelta = 0.0;

diddy.mouseZ = function() {
	var t = diddy_mouseWheelDelta;
	diddy_mouseWheelDelta = 0.0;
	return t;
}

diddy.mouseZInit = function() {
	var canvas=document.getElementById( "GameCanvas" );
	
	canvas.onmousewheel = function(e) {
		diddy_mouseWheelDelta += e.wheelDelta/120.0;
	}
}

diddy.systemMillisecs=function(){
	return new Date().getTime();
};

diddy.setGraphics=function(w, h)
{
	var canvas=document.getElementById( "GameCanvas" );
	canvas.width  = w;
	canvas.height = h;
	//return window.innerHeight;
}
diddy.setMouse=function(x, y)
{
}
diddy.showKeyboard=function()
{
}
diddy.launchBrowser=function(address, windowName)
{
	window.open(address, windowName);
}
diddy.launchEmail=function(email, subject, text)
{
	location.href="mailto:"+email+"&subject="+subject+"&body="+text+"";
}

diddy.startVibrate=function(millisecs)
{
}
diddy.stopVibrate=function()
{
}

diddy.getDayOfMonth=function(){
	return new Date().getDate();
}

diddy.getDayOfWeek=function(){
	return new Date().getDay()+1;
}

diddy.getMonth=function(){
	return new Date().getMonth()+1;
}

diddy.getYear=function(){
	return new Date().getFullYear();
}

diddy.getHours=function(){
	return new Date().getHours();
}

diddy.getMinutes=function(){
	return new Date().getMinutes();
}

diddy.getSeconds=function(){
	return new Date().getSeconds();
}

diddy.getMilliSeconds=function(){
	return new Date().getMilliseconds();
}

diddy.startGps=function(){

}
diddy.getLatitiude=function(){
	return ""
}
diddy.getLongitude=function(){
	return ""
}
diddy.showAlertDialog=function(title, message)
{
}
diddy.getInputString=function()
{
	return "";
}
// Browser detect from http://www.quirksmode.org/js/detect.html
var BrowserDetect = {
	init: function () {
		this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
		this.version = this.searchVersion(navigator.userAgent)
			|| this.searchVersion(navigator.appVersion)
			|| "an unknown version";
		this.OS = this.searchString(this.dataOS) || "an unknown OS";
	},
	searchString: function (data) {
		for (var i=0;i<data.length;i++)	{
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch || data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			}
			else if (dataProp)
				return data[i].identity;
		}
	},
	searchVersion: function (dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1) return;
		return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
	},
	dataBrowser: [
		{
			string: navigator.userAgent,
			subString: "Chrome",
			identity: "Chrome"
		},
		{ 	string: navigator.userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/",
			identity: "OmniWeb"
		},
		{
			string: navigator.vendor,
			subString: "Apple",
			identity: "Safari",
			versionSearch: "Version"
		},
		{
			prop: window.opera,
			identity: "Opera",
			versionSearch: "Version"
		},
		{
			string: navigator.vendor,
			subString: "iCab",
			identity: "iCab"
		},
		{
			string: navigator.vendor,
			subString: "KDE",
			identity: "Konqueror"
		},
		{
			string: navigator.userAgent,
			subString: "Firefox",
			identity: "Firefox"
		},
		{
			string: navigator.vendor,
			subString: "Camino",
			identity: "Camino"
		},
		{		// for newer Netscapes (6+)
			string: navigator.userAgent,
			subString: "Netscape",
			identity: "Netscape"
		},
		{
			string: navigator.userAgent,
			subString: "MSIE",
			identity: "Explorer",
			versionSearch: "MSIE"
		},
		{
			string: navigator.userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},
		{ 		// for older Netscapes (4-)
			string: navigator.userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		}
	],
	dataOS : [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},
		{
			string: navigator.platform,
			subString: "Mac",
			identity: "Mac"
		},
		{
			string: navigator.userAgent,
			subString: "iPhone",
			identity: "iPhone/iPod"
	    },
		{
			string: navigator.platform,
			subString: "Linux",
			identity: "Linux"
		}
	]

};
BrowserDetect.init();

diddy.getBrowserName=function(){
	return BrowserDetect.browser;
};

diddy.getBrowserVersion=function(){
	return BrowserDetect.version;
};

diddy.getBrowserOS=function(){
	return BrowserDetect.OS;
};

diddy.seekMusic=function(timeMillis)
{
	if(bb_audio_device &&
		bb_audio_device.channels &&
		bb_audio_device.channels[32] &&
		bb_audio_device.channels[32].audio)
	{
		var audio = bb_audio_device.channels[32].audio;
		try {
			audio.currentTime = timeMillis/1000.0;
			return 1;
		} catch(e) {}
	}
	return 0;
};

function c_DiddyException(){
	ThrowableObject.call(this);
	this.m_message="";
	this.m_cause=null;
	this.m_type="";
	this.m_fullType="";
}
c_DiddyException.prototype=extend_class(ThrowableObject);
c_DiddyException.prototype.p_Message=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<22>";
	pop_err();
	return this.m_message;
}
c_DiddyException.prototype.p_Message2=function(t_message){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<26>";
	dbg_object(this).m_message=t_message;
	pop_err();
}
c_DiddyException.prototype.p_Cause=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<30>";
	pop_err();
	return this.m_cause;
}
c_DiddyException.prototype.p_Cause2=function(t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<34>";
	if(t_cause==(this)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<34>";
		t_cause=null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<35>";
	dbg_object(this).m_cause=t_cause;
	pop_err();
}
c_DiddyException.prototype.p_Type=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<39>";
	pop_err();
	return this.m_type;
}
c_DiddyException.prototype.p_FullType=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<43>";
	pop_err();
	return this.m_fullType;
}
c_DiddyException.prototype.p_ToString=function(t_recurse){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<63>";
	var t_rv=this.m_type+": "+this.m_message;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<64>";
	if(t_recurse){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<65>";
		var t_depth=10;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<66>";
		var t_current=this.m_cause;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<67>";
		while(((t_current)!=null) && t_depth>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<68>";
			if((object_downcast((t_current),c_DiddyException))!=null){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<69>";
				t_rv=t_rv+("\nCaused by "+this.m_type+": "+dbg_object(object_downcast((t_current),c_DiddyException)).m_message);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<70>";
				t_current=dbg_object(object_downcast((t_current),c_DiddyException)).m_cause;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<71>";
				t_depth-=1;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<73>";
				t_rv=t_rv+"\nCaused by a non-Diddy exception.";
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<74>";
				t_current=null;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<78>";
	pop_err();
	return t_rv;
}
c_DiddyException.m_new=function(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<47>";
	dbg_object(this).m_message=t_message;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<48>";
	dbg_object(this).m_cause=t_cause;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<49>";
	var t_ci=bb_reflection_GetClass2(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<50>";
	if((t_ci)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<51>";
		dbg_object(this).m_fullType=t_ci.p_Name();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<53>";
		dbg_object(this).m_fullType="diddy.exception.DiddyException";
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<55>";
	if(dbg_object(this).m_fullType.indexOf(".")!=-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<56>";
		dbg_object(this).m_type=dbg_object(this).m_fullType.slice(dbg_object(this).m_fullType.lastIndexOf(".")+1);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<58>";
		dbg_object(this).m_type=dbg_object(this).m_fullType;
	}
	pop_err();
	return this;
}
function c_ClassInfo(){
	Object.call(this);
	this.m__name="";
	this.m__attrs=0;
	this.m__sclass=null;
	this.m__ifaces=[];
	this.m__rconsts=[];
	this.m__consts=[];
	this.m__rfields=[];
	this.m__fields=[];
	this.m__rglobals=[];
	this.m__globals=[];
	this.m__rmethods=[];
	this.m__methods=[];
	this.m__rfunctions=[];
	this.m__functions=[];
	this.m__ctors=[];
}
c_ClassInfo.prototype.p_Name=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<222>";
	pop_err();
	return this.m__name;
}
c_ClassInfo.m_new=function(t_name,t_attrs,t_sclass,t_ifaces){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<215>";
	this.m__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<216>";
	this.m__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<217>";
	this.m__sclass=t_sclass;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<218>";
	this.m__ifaces=t_ifaces;
	pop_err();
	return this;
}
c_ClassInfo.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<212>";
	pop_err();
	return this;
}
c_ClassInfo.prototype.p_Init=function(){
	push_err();
	pop_err();
	return 0;
}
c_ClassInfo.prototype.p_InitR=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<421>";
	if((this.m__sclass)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<422>";
		var t_consts=c_Stack.m_new2.call(new c_Stack,dbg_object(this.m__sclass).m__rconsts);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<423>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<423>";
		var t_=this.m__consts;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<423>";
		var t_2=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<423>";
		while(t_2<t_.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<423>";
			var t_t=dbg_array(t_,t_2)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<423>";
			t_2=t_2+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<424>";
			t_consts.p_Push(t_t);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<426>";
		this.m__rconsts=t_consts.p_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<427>";
		var t_fields=c_Stack2.m_new2.call(new c_Stack2,dbg_object(this.m__sclass).m__rfields);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<428>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<428>";
		var t_3=this.m__fields;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<428>";
		var t_4=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<428>";
		while(t_4<t_3.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<428>";
			var t_t2=dbg_array(t_3,t_4)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<428>";
			t_4=t_4+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<429>";
			t_fields.p_Push4(t_t2);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<431>";
		this.m__rfields=t_fields.p_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<432>";
		var t_globals=c_Stack3.m_new2.call(new c_Stack3,dbg_object(this.m__sclass).m__rglobals);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<433>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<433>";
		var t_5=this.m__globals;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<433>";
		var t_6=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<433>";
		while(t_6<t_5.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<433>";
			var t_t3=dbg_array(t_5,t_6)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<433>";
			t_6=t_6+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<434>";
			t_globals.p_Push7(t_t3);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<436>";
		this.m__rglobals=t_globals.p_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<437>";
		var t_methods=c_Stack4.m_new2.call(new c_Stack4,dbg_object(this.m__sclass).m__rmethods);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<438>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<438>";
		var t_7=this.m__methods;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<438>";
		var t_8=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<438>";
		while(t_8<t_7.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<438>";
			var t_t4=dbg_array(t_7,t_8)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<438>";
			t_8=t_8+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<439>";
			t_methods.p_Push10(t_t4);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<441>";
		this.m__rmethods=t_methods.p_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<442>";
		var t_functions=c_Stack5.m_new2.call(new c_Stack5,dbg_object(this.m__sclass).m__rfunctions);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<443>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<443>";
		var t_9=this.m__functions;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<443>";
		var t_10=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<443>";
		while(t_10<t_9.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<443>";
			var t_t5=dbg_array(t_9,t_10)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<443>";
			t_10=t_10+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<444>";
			t_functions.p_Push13(t_t5);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<446>";
		this.m__rfunctions=t_functions.p_ToArray();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<448>";
		this.m__rconsts=this.m__consts;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<449>";
		this.m__rfields=this.m__fields;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<450>";
		this.m__rglobals=this.m__globals;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<451>";
		this.m__rmethods=this.m__methods;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<452>";
		this.m__rfunctions=this.m__functions;
	}
	pop_err();
	return 0;
}
function c_Map(){
	Object.call(this);
	this.m_root=null;
}
c_Map.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
c_Map.prototype.p_Compare=function(t_lhs,t_rhs){
}
c_Map.prototype.p_RotateLeft=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>";
	var t_child=dbg_object(t_node).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>";
	dbg_object(t_node).m_right=dbg_object(t_child).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>";
	if((dbg_object(t_child).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>";
		dbg_object(dbg_object(t_child).m_left).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>";
	dbg_object(t_child).m_left=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map.prototype.p_RotateRight=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>";
	var t_child=dbg_object(t_node).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>";
	dbg_object(t_node).m_left=dbg_object(t_child).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>";
	if((dbg_object(t_child).m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>";
		dbg_object(dbg_object(t_child).m_right).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>";
	dbg_object(t_child).m_right=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map.prototype.p_InsertFixup=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>";
	while(((dbg_object(t_node).m_parent)!=null) && dbg_object(dbg_object(t_node).m_parent).m_color==-1 && ((dbg_object(dbg_object(t_node).m_parent).m_parent)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>";
		if(dbg_object(t_node).m_parent==dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>";
			var t_uncle=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_right;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>";
			if(((t_uncle)!=null) && dbg_object(t_uncle).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>";
				dbg_object(t_uncle).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>";
				dbg_object(dbg_object(t_uncle).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>";
				t_node=dbg_object(t_uncle).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>";
					this.p_RotateLeft(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>";
				this.p_RotateRight(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>";
			var t_uncle2=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>";
			if(((t_uncle2)!=null) && dbg_object(t_uncle2).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>";
				dbg_object(t_uncle2).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>";
				dbg_object(dbg_object(t_uncle2).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>";
				t_node=dbg_object(t_uncle2).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>";
					this.p_RotateRight(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>";
				this.p_RotateLeft(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>";
	dbg_object(this.m_root).m_color=1;
	pop_err();
	return 0;
}
c_Map.prototype.p_Set=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_parent=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_cmp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>";
		t_parent=t_node;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>";
		t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>";
				dbg_object(t_node).m_value=t_value;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>";
				pop_err();
				return false;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>";
	t_node=c_Node.m_new.call(new c_Node,t_key,t_value,-1,t_parent);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>";
	if((t_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>";
			dbg_object(t_parent).m_right=t_node;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>";
			dbg_object(t_parent).m_left=t_node;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>";
		this.p_InsertFixup(t_node);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>";
		this.m_root=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>";
	pop_err();
	return true;
}
c_Map.prototype.p_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>";
				pop_err();
				return t_node;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>";
	pop_err();
	return t_node;
}
c_Map.prototype.p_Contains=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>";
	var t_=this.p_FindNode(t_key)!=null;
	pop_err();
	return t_;
}
c_Map.prototype.p_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.p_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).m_value;
	}
	pop_err();
	return null;
}
function c_StringMap(){
	c_Map.call(this);
}
c_StringMap.prototype=extend_class(c_Map);
c_StringMap.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	c_Map.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
c_StringMap.prototype.p_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
var bb_reflection__classesMap=null;
var bb_reflection__classes=[];
function c_Node(){
	Object.call(this);
	this.m_key="";
	this.m_right=null;
	this.m_left=null;
	this.m_value=null;
	this.m_color=0;
	this.m_parent=null;
}
c_Node.m_new=function(t_key,t_value,t_color,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>";
	dbg_object(this).m_key=t_key;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>";
	dbg_object(this).m_value=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>";
	dbg_object(this).m_color=t_color;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>";
	dbg_object(this).m_parent=t_parent;
	pop_err();
	return this;
}
c_Node.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>";
	pop_err();
	return this;
}
function bb_reflection_GetClass(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<463>";
	if(!((bb_reflection__classesMap)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<464>";
		bb_reflection__classesMap=c_StringMap.m_new.call(new c_StringMap);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>";
		var t_=bb_reflection__classes;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>";
		var t_2=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>";
		while(t_2<t_.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>";
			var t_c=dbg_array(t_,t_2)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>";
			t_2=t_2+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<466>";
			var t_name2=t_c.p_Name();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>";
			bb_reflection__classesMap.p_Set(t_name2,t_c);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<468>";
			var t_i=t_name2.lastIndexOf(".");
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<469>";
			if(t_i==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<469>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<470>";
			t_name2=t_name2.slice(t_i+1);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<471>";
			if(bb_reflection__classesMap.p_Contains(t_name2)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>";
				bb_reflection__classesMap.p_Set(t_name2,null);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<474>";
				bb_reflection__classesMap.p_Set(t_name2,t_c);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<478>";
	var t_3=bb_reflection__classesMap.p_Get(t_name);
	pop_err();
	return t_3;
}
function c__GetClass(){
	Object.call(this);
}
c__GetClass.prototype.p_GetClass=function(t_obj){
}
c__GetClass.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<608>";
	pop_err();
	return this;
}
var bb_reflection__getClass=null;
function bb_reflection_GetClass2(t_obj){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>";
	var t_=bb_reflection__getClass.p_GetClass(t_obj);
	pop_err();
	return t_;
}
function c_AssertException(){
	c_DiddyException.call(this);
}
c_AssertException.prototype=extend_class(c_DiddyException);
c_AssertException.m_new=function(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<86>";
	c_DiddyException.m_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function c_ConcurrentModificationException(){
	c_DiddyException.call(this);
}
c_ConcurrentModificationException.prototype=extend_class(c_DiddyException);
c_ConcurrentModificationException.m_new=function(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<92>";
	c_DiddyException.m_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function c_IndexOutOfBoundsException(){
	c_DiddyException.call(this);
}
c_IndexOutOfBoundsException.prototype=extend_class(c_DiddyException);
c_IndexOutOfBoundsException.m_new=function(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<98>";
	c_DiddyException.m_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function c_IllegalArgumentException(){
	c_DiddyException.call(this);
}
c_IllegalArgumentException.prototype=extend_class(c_DiddyException);
c_IllegalArgumentException.m_new=function(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<104>";
	c_DiddyException.m_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function c_XMLParseException(){
	c_DiddyException.call(this);
}
c_XMLParseException.prototype=extend_class(c_DiddyException);
c_XMLParseException.m_new=function(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<110>";
	c_DiddyException.m_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function c_BoolObject(){
	Object.call(this);
	this.m_value=false;
}
c_BoolObject.m_new=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<11>";
	dbg_object(this).m_value=t_value;
	pop_err();
	return this;
}
c_BoolObject.prototype.p_ToBool=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<15>";
	pop_err();
	return this.m_value;
}
c_BoolObject.prototype.p_Equals=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<19>";
	var t_=this.m_value==dbg_object(t_box).m_value;
	pop_err();
	return t_;
}
c_BoolObject.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<7>";
	pop_err();
	return this;
}
function c_IntObject(){
	Object.call(this);
	this.m_value=0;
}
c_IntObject.m_new=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<27>";
	dbg_object(this).m_value=t_value;
	pop_err();
	return this;
}
c_IntObject.m_new2=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<31>";
	dbg_object(this).m_value=((t_value)|0);
	pop_err();
	return this;
}
c_IntObject.prototype.p_ToInt=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<35>";
	pop_err();
	return this.m_value;
}
c_IntObject.prototype.p_ToFloat=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<39>";
	var t_=(this.m_value);
	pop_err();
	return t_;
}
c_IntObject.prototype.p_ToString2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<43>";
	var t_=String(this.m_value);
	pop_err();
	return t_;
}
c_IntObject.prototype.p_Equals2=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<47>";
	var t_=this.m_value==dbg_object(t_box).m_value;
	pop_err();
	return t_;
}
c_IntObject.prototype.p_Compare2=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<51>";
	var t_=this.m_value-dbg_object(t_box).m_value;
	pop_err();
	return t_;
}
c_IntObject.m_new3=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<23>";
	pop_err();
	return this;
}
function c_FloatObject(){
	Object.call(this);
	this.m_value=.0;
}
c_FloatObject.m_new=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<59>";
	dbg_object(this).m_value=(t_value);
	pop_err();
	return this;
}
c_FloatObject.m_new2=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<63>";
	dbg_object(this).m_value=t_value;
	pop_err();
	return this;
}
c_FloatObject.prototype.p_ToInt=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<67>";
	var t_=((this.m_value)|0);
	pop_err();
	return t_;
}
c_FloatObject.prototype.p_ToFloat=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<71>";
	pop_err();
	return this.m_value;
}
c_FloatObject.prototype.p_ToString2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<75>";
	var t_=String(this.m_value);
	pop_err();
	return t_;
}
c_FloatObject.prototype.p_Equals3=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<79>";
	var t_=this.m_value==dbg_object(t_box).m_value;
	pop_err();
	return t_;
}
c_FloatObject.prototype.p_Compare3=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<83>";
	if(this.m_value<dbg_object(t_box).m_value){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<83>";
		pop_err();
		return -1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<84>";
	var t_=((this.m_value>dbg_object(t_box).m_value)?1:0);
	pop_err();
	return t_;
}
c_FloatObject.m_new3=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<55>";
	pop_err();
	return this;
}
function c_StringObject(){
	Object.call(this);
	this.m_value="";
}
c_StringObject.m_new=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<92>";
	dbg_object(this).m_value=String(t_value);
	pop_err();
	return this;
}
c_StringObject.m_new2=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<96>";
	dbg_object(this).m_value=String(t_value);
	pop_err();
	return this;
}
c_StringObject.m_new3=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<100>";
	dbg_object(this).m_value=t_value;
	pop_err();
	return this;
}
c_StringObject.prototype.p_ToString2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<104>";
	pop_err();
	return this.m_value;
}
c_StringObject.prototype.p_Equals4=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<108>";
	var t_=this.m_value==dbg_object(t_box).m_value;
	pop_err();
	return t_;
}
c_StringObject.prototype.p_Compare4=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<112>";
	var t_=string_compare(this.m_value,dbg_object(t_box).m_value);
	pop_err();
	return t_;
}
c_StringObject.m_new4=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<88>";
	pop_err();
	return this;
}
function bb_boxes_BoxBool(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<139>";
	var t_=(c_BoolObject.m_new.call(new c_BoolObject,t_value));
	pop_err();
	return t_;
}
function bb_boxes_BoxInt(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<143>";
	var t_=(c_IntObject.m_new.call(new c_IntObject,t_value));
	pop_err();
	return t_;
}
function bb_boxes_BoxFloat(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<147>";
	var t_=(c_FloatObject.m_new2.call(new c_FloatObject,t_value));
	pop_err();
	return t_;
}
function bb_boxes_BoxString(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<151>";
	var t_=(c_StringObject.m_new3.call(new c_StringObject,t_value));
	pop_err();
	return t_;
}
function bb_boxes_UnboxBool(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<155>";
	var t_=dbg_object(object_downcast((t_box),c_BoolObject)).m_value;
	pop_err();
	return t_;
}
function bb_boxes_UnboxInt(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<159>";
	var t_=dbg_object(object_downcast((t_box),c_IntObject)).m_value;
	pop_err();
	return t_;
}
function bb_boxes_UnboxFloat(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<163>";
	var t_=dbg_object(object_downcast((t_box),c_FloatObject)).m_value;
	pop_err();
	return t_;
}
function bb_boxes_UnboxString(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<167>";
	var t_=dbg_object(object_downcast((t_box),c_StringObject)).m_value;
	pop_err();
	return t_;
}
function c_R16(){
	c_ClassInfo.call(this);
}
c_R16.prototype=extend_class(c_ClassInfo);
c_R16.m_new=function(){
	c_ClassInfo.m_new.call(this,"monkey.lang.Object",1,null,[]);
	return this;
}
c_R16.prototype.p_Init=function(){
	this.p_InitR();
	return 0;
}
function c_R17(){
	c_ClassInfo.call(this);
}
c_R17.prototype=extend_class(c_ClassInfo);
c_R17.m_new=function(){
	c_ClassInfo.m_new.call(this,"monkey.lang.Throwable",33,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	return this;
}
c_R17.prototype.p_Init=function(){
	this.p_InitR();
	return 0;
}
function c_R18(){
	c_ClassInfo.call(this);
}
c_R18.prototype=extend_class(c_ClassInfo);
c_R18.m_new=function(){
	c_ClassInfo.m_new.call(this,"diddy.exception.DiddyException",32,dbg_array(bb_reflection__classes,1)[dbg_index],[]);
	return this;
}
c_R18.prototype.p_Init=function(){
	this.m__fields=new_object_array(4);
	dbg_array(this.m__fields,0)[dbg_index]=(c_R19.m_new.call(new c_R19))
	dbg_array(this.m__fields,1)[dbg_index]=(c_R20.m_new.call(new c_R20))
	dbg_array(this.m__fields,2)[dbg_index]=(c_R21.m_new.call(new c_R21))
	dbg_array(this.m__fields,3)[dbg_index]=(c_R22.m_new.call(new c_R22))
	this.m__methods=new_object_array(7);
	dbg_array(this.m__methods,0)[dbg_index]=(c_R23.m_new.call(new c_R23))
	dbg_array(this.m__methods,1)[dbg_index]=(c_R24.m_new.call(new c_R24))
	dbg_array(this.m__methods,2)[dbg_index]=(c_R25.m_new.call(new c_R25))
	dbg_array(this.m__methods,3)[dbg_index]=(c_R26.m_new.call(new c_R26))
	dbg_array(this.m__methods,4)[dbg_index]=(c_R27.m_new.call(new c_R27))
	dbg_array(this.m__methods,5)[dbg_index]=(c_R28.m_new.call(new c_R28))
	dbg_array(this.m__methods,6)[dbg_index]=(c_R30.m_new.call(new c_R30))
	this.m__ctors=new_object_array(1);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R29.m_new.call(new c_R29))
	this.p_InitR();
	return 0;
}
function c_R31(){
	c_ClassInfo.call(this);
}
c_R31.prototype=extend_class(c_ClassInfo);
c_R31.m_new=function(){
	c_ClassInfo.m_new.call(this,"diddy.exception.AssertException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
c_R31.prototype.p_Init=function(){
	this.m__ctors=new_object_array(1);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R32.m_new.call(new c_R32))
	this.p_InitR();
	return 0;
}
function c_R33(){
	c_ClassInfo.call(this);
}
c_R33.prototype=extend_class(c_ClassInfo);
c_R33.m_new=function(){
	c_ClassInfo.m_new.call(this,"diddy.exception.ConcurrentModificationException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
c_R33.prototype.p_Init=function(){
	this.m__ctors=new_object_array(1);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R34.m_new.call(new c_R34))
	this.p_InitR();
	return 0;
}
function c_R35(){
	c_ClassInfo.call(this);
}
c_R35.prototype=extend_class(c_ClassInfo);
c_R35.m_new=function(){
	c_ClassInfo.m_new.call(this,"diddy.exception.IndexOutOfBoundsException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
c_R35.prototype.p_Init=function(){
	this.m__ctors=new_object_array(1);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R36.m_new.call(new c_R36))
	this.p_InitR();
	return 0;
}
function c_R37(){
	c_ClassInfo.call(this);
}
c_R37.prototype=extend_class(c_ClassInfo);
c_R37.m_new=function(){
	c_ClassInfo.m_new.call(this,"diddy.exception.IllegalArgumentException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
c_R37.prototype.p_Init=function(){
	this.m__ctors=new_object_array(1);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R38.m_new.call(new c_R38))
	this.p_InitR();
	return 0;
}
function c_R39(){
	c_ClassInfo.call(this);
}
c_R39.prototype=extend_class(c_ClassInfo);
c_R39.m_new=function(){
	c_ClassInfo.m_new.call(this,"diddy.exception.XMLParseException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
c_R39.prototype.p_Init=function(){
	this.m__ctors=new_object_array(1);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R40.m_new.call(new c_R40))
	this.p_InitR();
	return 0;
}
function c_R41(){
	c_ClassInfo.call(this);
}
c_R41.prototype=extend_class(c_ClassInfo);
c_R41.m_new=function(){
	c_ClassInfo.m_new.call(this,"monkey.boxes.BoolObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__boolClass=(this);
	return this;
}
c_R41.prototype.p_Init=function(){
	this.m__fields=new_object_array(1);
	dbg_array(this.m__fields,0)[dbg_index]=(c_R42.m_new.call(new c_R42))
	this.m__methods=new_object_array(2);
	dbg_array(this.m__methods,0)[dbg_index]=(c_R44.m_new.call(new c_R44))
	dbg_array(this.m__methods,1)[dbg_index]=(c_R45.m_new.call(new c_R45))
	this.m__ctors=new_object_array(2);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R43.m_new.call(new c_R43))
	dbg_array(this.m__ctors,1)[dbg_index]=(c_R46.m_new.call(new c_R46))
	this.p_InitR();
	return 0;
}
var bb_reflection__boolClass=null;
function c_R47(){
	c_ClassInfo.call(this);
}
c_R47.prototype=extend_class(c_ClassInfo);
c_R47.m_new=function(){
	c_ClassInfo.m_new.call(this,"monkey.boxes.IntObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__intClass=(this);
	return this;
}
c_R47.prototype.p_Init=function(){
	this.m__fields=new_object_array(1);
	dbg_array(this.m__fields,0)[dbg_index]=(c_R48.m_new.call(new c_R48))
	this.m__methods=new_object_array(5);
	dbg_array(this.m__methods,0)[dbg_index]=(c_R51.m_new.call(new c_R51))
	dbg_array(this.m__methods,1)[dbg_index]=(c_R52.m_new.call(new c_R52))
	dbg_array(this.m__methods,2)[dbg_index]=(c_R53.m_new.call(new c_R53))
	dbg_array(this.m__methods,3)[dbg_index]=(c_R54.m_new.call(new c_R54))
	dbg_array(this.m__methods,4)[dbg_index]=(c_R55.m_new.call(new c_R55))
	this.m__ctors=new_object_array(3);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R49.m_new.call(new c_R49))
	dbg_array(this.m__ctors,1)[dbg_index]=(c_R50.m_new.call(new c_R50))
	dbg_array(this.m__ctors,2)[dbg_index]=(c_R56.m_new.call(new c_R56))
	this.p_InitR();
	return 0;
}
var bb_reflection__intClass=null;
function c_R57(){
	c_ClassInfo.call(this);
}
c_R57.prototype=extend_class(c_ClassInfo);
c_R57.m_new=function(){
	c_ClassInfo.m_new.call(this,"monkey.boxes.FloatObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__floatClass=(this);
	return this;
}
c_R57.prototype.p_Init=function(){
	this.m__fields=new_object_array(1);
	dbg_array(this.m__fields,0)[dbg_index]=(c_R58.m_new.call(new c_R58))
	this.m__methods=new_object_array(5);
	dbg_array(this.m__methods,0)[dbg_index]=(c_R61.m_new.call(new c_R61))
	dbg_array(this.m__methods,1)[dbg_index]=(c_R62.m_new.call(new c_R62))
	dbg_array(this.m__methods,2)[dbg_index]=(c_R63.m_new.call(new c_R63))
	dbg_array(this.m__methods,3)[dbg_index]=(c_R64.m_new.call(new c_R64))
	dbg_array(this.m__methods,4)[dbg_index]=(c_R65.m_new.call(new c_R65))
	this.m__ctors=new_object_array(3);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R59.m_new.call(new c_R59))
	dbg_array(this.m__ctors,1)[dbg_index]=(c_R60.m_new.call(new c_R60))
	dbg_array(this.m__ctors,2)[dbg_index]=(c_R66.m_new.call(new c_R66))
	this.p_InitR();
	return 0;
}
var bb_reflection__floatClass=null;
function c_R67(){
	c_ClassInfo.call(this);
}
c_R67.prototype=extend_class(c_ClassInfo);
c_R67.m_new=function(){
	c_ClassInfo.m_new.call(this,"monkey.boxes.StringObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__stringClass=(this);
	return this;
}
c_R67.prototype.p_Init=function(){
	this.m__fields=new_object_array(1);
	dbg_array(this.m__fields,0)[dbg_index]=(c_R68.m_new.call(new c_R68))
	this.m__methods=new_object_array(3);
	dbg_array(this.m__methods,0)[dbg_index]=(c_R72.m_new.call(new c_R72))
	dbg_array(this.m__methods,1)[dbg_index]=(c_R73.m_new.call(new c_R73))
	dbg_array(this.m__methods,2)[dbg_index]=(c_R74.m_new.call(new c_R74))
	this.m__ctors=new_object_array(4);
	dbg_array(this.m__ctors,0)[dbg_index]=(c_R69.m_new.call(new c_R69))
	dbg_array(this.m__ctors,1)[dbg_index]=(c_R70.m_new.call(new c_R70))
	dbg_array(this.m__ctors,2)[dbg_index]=(c_R71.m_new.call(new c_R71))
	dbg_array(this.m__ctors,3)[dbg_index]=(c_R75.m_new.call(new c_R75))
	this.p_InitR();
	return 0;
}
var bb_reflection__stringClass=null;
function c_FunctionInfo(){
	Object.call(this);
	this.m__name="";
	this.m__attrs=0;
	this.m__retType=null;
	this.m__argTypes=[];
}
c_FunctionInfo.m_new=function(t_name,t_attrs,t_retType,t_argTypes){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<179>";
	this.m__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<180>";
	this.m__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<181>";
	this.m__retType=t_retType;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<182>";
	this.m__argTypes=t_argTypes;
	pop_err();
	return this;
}
c_FunctionInfo.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<176>";
	pop_err();
	return this;
}
var bb_reflection__functions=[];
function c_R4(){
	c_FunctionInfo.call(this);
}
c_R4.prototype=extend_class(c_FunctionInfo);
c_R4.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.BoxBool",0,dbg_array(bb_reflection__classes,0)[dbg_index],[bb_reflection__boolClass]);
	return this;
}
function c_R5(){
	c_FunctionInfo.call(this);
}
c_R5.prototype=extend_class(c_FunctionInfo);
c_R5.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.BoxInt",0,dbg_array(bb_reflection__classes,0)[dbg_index],[bb_reflection__intClass]);
	return this;
}
function c_R6(){
	c_FunctionInfo.call(this);
}
c_R6.prototype=extend_class(c_FunctionInfo);
c_R6.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.BoxFloat",0,dbg_array(bb_reflection__classes,0)[dbg_index],[bb_reflection__floatClass]);
	return this;
}
function c_R7(){
	c_FunctionInfo.call(this);
}
c_R7.prototype=extend_class(c_FunctionInfo);
c_R7.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.BoxString",0,dbg_array(bb_reflection__classes,0)[dbg_index],[bb_reflection__stringClass]);
	return this;
}
function c_R8(){
	c_FunctionInfo.call(this);
}
c_R8.prototype=extend_class(c_FunctionInfo);
c_R8.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.UnboxBool",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,0)[dbg_index]]);
	return this;
}
function c_R9(){
	c_FunctionInfo.call(this);
}
c_R9.prototype=extend_class(c_FunctionInfo);
c_R9.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.UnboxInt",0,bb_reflection__intClass,[dbg_array(bb_reflection__classes,0)[dbg_index]]);
	return this;
}
function c_R10(){
	c_FunctionInfo.call(this);
}
c_R10.prototype=extend_class(c_FunctionInfo);
c_R10.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.UnboxFloat",0,bb_reflection__floatClass,[dbg_array(bb_reflection__classes,0)[dbg_index]]);
	return this;
}
function c_R11(){
	c_FunctionInfo.call(this);
}
c_R11.prototype=extend_class(c_FunctionInfo);
c_R11.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.boxes.UnboxString",0,bb_reflection__stringClass,[dbg_array(bb_reflection__classes,0)[dbg_index]]);
	return this;
}
function c_R12(){
	c_FunctionInfo.call(this);
}
c_R12.prototype=extend_class(c_FunctionInfo);
c_R12.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.lang.Print",1,bb_reflection__intClass,[bb_reflection__stringClass]);
	return this;
}
function c_R13(){
	c_FunctionInfo.call(this);
}
c_R13.prototype=extend_class(c_FunctionInfo);
c_R13.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.lang.Error",1,bb_reflection__intClass,[bb_reflection__stringClass]);
	return this;
}
function c_R14(){
	c_FunctionInfo.call(this);
}
c_R14.prototype=extend_class(c_FunctionInfo);
c_R14.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.lang.DebugLog",1,bb_reflection__intClass,[bb_reflection__stringClass]);
	return this;
}
function c_R15(){
	c_FunctionInfo.call(this);
}
c_R15.prototype=extend_class(c_FunctionInfo);
c_R15.m_new=function(){
	c_FunctionInfo.m_new.call(this,"monkey.lang.DebugStop",1,bb_reflection__intClass,[]);
	return this;
}
function c___GetClass(){
	c__GetClass.call(this);
}
c___GetClass.prototype=extend_class(c__GetClass);
c___GetClass.m_new=function(){
	push_err();
	err_info="$SOURCE<745>";
	c__GetClass.m_new.call(this);
	err_info="$SOURCE<745>";
	pop_err();
	return this;
}
c___GetClass.prototype.p_GetClass=function(t_o){
	if(object_downcast((t_o),c_StringObject)!=null){
		return dbg_array(bb_reflection__classes,11)[dbg_index];
	}
	if(object_downcast((t_o),c_FloatObject)!=null){
		return dbg_array(bb_reflection__classes,10)[dbg_index];
	}
	if(object_downcast((t_o),c_IntObject)!=null){
		return dbg_array(bb_reflection__classes,9)[dbg_index];
	}
	if(object_downcast((t_o),c_BoolObject)!=null){
		return dbg_array(bb_reflection__classes,8)[dbg_index];
	}
	if(object_downcast((t_o),c_XMLParseException)!=null){
		return dbg_array(bb_reflection__classes,7)[dbg_index];
	}
	if(object_downcast((t_o),c_IllegalArgumentException)!=null){
		return dbg_array(bb_reflection__classes,6)[dbg_index];
	}
	if(object_downcast((t_o),c_IndexOutOfBoundsException)!=null){
		return dbg_array(bb_reflection__classes,5)[dbg_index];
	}
	if(object_downcast((t_o),c_ConcurrentModificationException)!=null){
		return dbg_array(bb_reflection__classes,4)[dbg_index];
	}
	if(object_downcast((t_o),c_AssertException)!=null){
		return dbg_array(bb_reflection__classes,3)[dbg_index];
	}
	if(object_downcast((t_o),c_DiddyException)!=null){
		return dbg_array(bb_reflection__classes,2)[dbg_index];
	}
	if(object_downcast((t_o),ThrowableObject)!=null){
		return dbg_array(bb_reflection__classes,1)[dbg_index];
	}
	if(t_o!=null){
		return dbg_array(bb_reflection__classes,0)[dbg_index];
	}
	return bb_reflection__unknownClass;
}
function bb_reflection___init(){
	bb_reflection__classes=new_object_array(12);
	dbg_array(bb_reflection__classes,0)[dbg_index]=(c_R16.m_new.call(new c_R16))
	dbg_array(bb_reflection__classes,1)[dbg_index]=(c_R17.m_new.call(new c_R17))
	dbg_array(bb_reflection__classes,2)[dbg_index]=(c_R18.m_new.call(new c_R18))
	dbg_array(bb_reflection__classes,3)[dbg_index]=(c_R31.m_new.call(new c_R31))
	dbg_array(bb_reflection__classes,4)[dbg_index]=(c_R33.m_new.call(new c_R33))
	dbg_array(bb_reflection__classes,5)[dbg_index]=(c_R35.m_new.call(new c_R35))
	dbg_array(bb_reflection__classes,6)[dbg_index]=(c_R37.m_new.call(new c_R37))
	dbg_array(bb_reflection__classes,7)[dbg_index]=(c_R39.m_new.call(new c_R39))
	dbg_array(bb_reflection__classes,8)[dbg_index]=(c_R41.m_new.call(new c_R41))
	dbg_array(bb_reflection__classes,9)[dbg_index]=(c_R47.m_new.call(new c_R47))
	dbg_array(bb_reflection__classes,10)[dbg_index]=(c_R57.m_new.call(new c_R57))
	dbg_array(bb_reflection__classes,11)[dbg_index]=(c_R67.m_new.call(new c_R67))
	dbg_array(bb_reflection__classes,0)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,1)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,2)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,3)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,4)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,5)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,6)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,7)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,8)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,9)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,10)[dbg_index].p_Init();
	dbg_array(bb_reflection__classes,11)[dbg_index].p_Init();
	bb_reflection__functions=new_object_array(12);
	dbg_array(bb_reflection__functions,0)[dbg_index]=(c_R4.m_new.call(new c_R4))
	dbg_array(bb_reflection__functions,1)[dbg_index]=(c_R5.m_new.call(new c_R5))
	dbg_array(bb_reflection__functions,2)[dbg_index]=(c_R6.m_new.call(new c_R6))
	dbg_array(bb_reflection__functions,3)[dbg_index]=(c_R7.m_new.call(new c_R7))
	dbg_array(bb_reflection__functions,4)[dbg_index]=(c_R8.m_new.call(new c_R8))
	dbg_array(bb_reflection__functions,5)[dbg_index]=(c_R9.m_new.call(new c_R9))
	dbg_array(bb_reflection__functions,6)[dbg_index]=(c_R10.m_new.call(new c_R10))
	dbg_array(bb_reflection__functions,7)[dbg_index]=(c_R11.m_new.call(new c_R11))
	dbg_array(bb_reflection__functions,8)[dbg_index]=(c_R12.m_new.call(new c_R12))
	dbg_array(bb_reflection__functions,9)[dbg_index]=(c_R13.m_new.call(new c_R13))
	dbg_array(bb_reflection__functions,10)[dbg_index]=(c_R14.m_new.call(new c_R14))
	dbg_array(bb_reflection__functions,11)[dbg_index]=(c_R15.m_new.call(new c_R15))
	bb_reflection__getClass=(c___GetClass.m_new.call(new c___GetClass));
	return 0;
}
var bb_reflection__init=0;
function c_App(){
	Object.call(this);
}
c_App.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<104>";
	if((bb_app__app)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<104>";
		error("App has already been created");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<105>";
	bb_app__app=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<106>";
	bb_app__delegate=c_GameDelegate.m_new.call(new c_GameDelegate);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<107>";
	bb_app__game.SetDelegate(bb_app__delegate);
	pop_err();
	return this;
}
c_App.prototype.p_OnCreate=function(){
	push_err();
	pop_err();
	return 0;
}
c_App.prototype.p_OnSuspend=function(){
	push_err();
	pop_err();
	return 0;
}
c_App.prototype.p_OnResume=function(){
	push_err();
	pop_err();
	return 0;
}
c_App.prototype.p_OnUpdate=function(){
	push_err();
	pop_err();
	return 0;
}
c_App.prototype.p_OnLoading=function(){
	push_err();
	pop_err();
	return 0;
}
c_App.prototype.p_OnRender=function(){
	push_err();
	pop_err();
	return 0;
}
c_App.prototype.p_OnClose=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<129>";
	bb_app_EndApp();
	pop_err();
	return 0;
}
c_App.prototype.p_OnBack=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<133>";
	this.p_OnClose();
	pop_err();
	return 0;
}
function c_DiddyApp(){
	c_App.call(this);
	this.m_screens=null;
	this.m_exitScreen=null;
	this.m_loadingScreen=null;
	this.m_screenFade=null;
	this.m_images=null;
	this.m_sounds=null;
	this.m_inputCache=null;
	this.m_diddyMouse=null;
	this.m_virtualResOn=true;
	this.m_aspectRatioOn=false;
	this.m_aspectRatio=.0;
	this.m_deviceChanged=0;
	this.m_mouseX=0;
	this.m_mouseY=0;
	this.m_FPS=60;
	this.m_useFixedRateLogic=false;
	this.m_frameRate=200.0;
	this.m_ms=0.0;
	this.m_numTicks=.0;
	this.m_lastNumTicks=.0;
	this.m_lastTime=.0;
	this.m_multi=.0;
	this.m_heightBorder=.0;
	this.m_widthBorder=.0;
	this.m_vsx=.0;
	this.m_vsy=.0;
	this.m_vsw=.0;
	this.m_vsh=.0;
	this.m_virtualScaledW=.0;
	this.m_virtualScaledH=.0;
	this.m_virtualXOff=.0;
	this.m_virtualYOff=.0;
	this.m_autoCls=false;
	this.m_currentScreen=null;
	this.m_debugOn=false;
	this.m_musicFile="";
	this.m_musicOkay=0;
	this.m_musicVolume=100;
	this.m_mojoMusicVolume=1.0;
	this.m_soundVolume=100;
	this.m_drawFPSOn=false;
	this.m_mouseHit=0;
	this.m_debugKeyOn=false;
	this.m_debugKey=112;
	this.m_tmpMs=.0;
	this.m_maxMs=50;
	this.m_nextScreen=null;
	this.m_scrollX=.0;
	this.m_scrollY=.0;
}
c_DiddyApp.prototype=extend_class(c_App);
c_DiddyApp.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<170>";
	c_App.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<173>";
	bb_framework_diddyGame=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<174>";
	dbg_object(this).m_screens=c_Screens.m_new.call(new c_Screens);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<175>";
	dbg_object(this).m_exitScreen=c_ExitScreen.m_new.call(new c_ExitScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<176>";
	dbg_object(this).m_loadingScreen=c_LoadingScreen.m_new.call(new c_LoadingScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<177>";
	dbg_object(this).m_screenFade=c_ScreenFade.m_new.call(new c_ScreenFade);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<178>";
	dbg_object(this).m_images=c_ImageBank.m_new.call(new c_ImageBank);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<179>";
	dbg_object(this).m_sounds=c_SoundBank.m_new.call(new c_SoundBank);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<180>";
	dbg_object(this).m_inputCache=c_InputCache.m_new.call(new c_InputCache);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<181>";
	this.m_diddyMouse=c_DiddyMouse.m_new.call(new c_DiddyMouse);
	pop_err();
	return this;
}
c_DiddyApp.prototype.p_SetScreenSize=function(t_w,t_h,t_useAspectRatio){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<227>";
	bb_framework_SCREEN_WIDTH=t_w;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<228>";
	bb_framework_SCREEN_HEIGHT=t_h;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<229>";
	bb_framework_SCREEN_WIDTH2=bb_framework_SCREEN_WIDTH/2.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<230>";
	bb_framework_SCREEN_HEIGHT2=bb_framework_SCREEN_HEIGHT/2.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<232>";
	bb_framework_SCREENX_RATIO=bb_framework_DEVICE_WIDTH/bb_framework_SCREEN_WIDTH;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<233>";
	bb_framework_SCREENY_RATIO=bb_framework_DEVICE_HEIGHT/bb_framework_SCREEN_HEIGHT;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<235>";
	if(bb_framework_SCREENX_RATIO!=1.0 || bb_framework_SCREENY_RATIO!=1.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<236>";
		this.m_virtualResOn=true;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<237>";
		this.m_aspectRatioOn=t_useAspectRatio;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<238>";
		this.m_aspectRatio=t_h/t_w;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<240>";
	if((bb_graphics_DeviceWidth())!=bb_framework_SCREEN_WIDTH || (bb_graphics_DeviceHeight())!=bb_framework_SCREEN_HEIGHT){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<241>";
		this.m_deviceChanged=1;
	}
	pop_err();
}
c_DiddyApp.prototype.p_ResetFixedRateLogic=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<494>";
	this.m_ms=1000.0/this.m_frameRate;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<495>";
	this.m_numTicks=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<496>";
	this.m_lastNumTicks=1.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<497>";
	this.m_lastTime=(bb_app_Millisecs());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<498>";
	if(bb_framework_dt!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<499>";
		dbg_object(bb_framework_dt).m_delta=1.0;
	}
	pop_err();
}
c_DiddyApp.prototype.p_Create=function(){
	push_err();
	pop_err();
}
c_DiddyApp.prototype.p_OnCreate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<185>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<187>";
		bb_framework_DEVICE_WIDTH=(bb_graphics_DeviceWidth());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<188>";
		bb_framework_DEVICE_HEIGHT=(bb_graphics_DeviceHeight());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<190>";
		this.p_SetScreenSize(bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT,false);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<191>";
		this.m_deviceChanged=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<194>";
		this.m_mouseX=((bb_input_MouseX()/bb_framework_SCREENX_RATIO)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<195>";
		this.m_mouseY=((bb_input_MouseY()/bb_framework_SCREENY_RATIO)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<198>";
		bb_random_Seed=diddy.systemMillisecs();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<200>";
		bb_framework_dt=c_DeltaTimer.m_new.call(new c_DeltaTimer,(this.m_FPS));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<202>";
		bb_app_SetUpdateRate(this.m_FPS);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<205>";
		c_Particle.m_Cache();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<208>";
		if(this.m_useFixedRateLogic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<209>";
			this.p_ResetFixedRateLogic();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<213>";
		this.p_Create();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,c_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<215>";
			print(t_e.p_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<216>";
			error(t_e.p_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<218>";
	pop_err();
	return 0;
}
c_DiddyApp.prototype.p_DrawDebug=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<400>";
	bb_graphics_SetColor(255.0,255.0,255.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<401>";
	c_FPSCounter.m_Draw(0,0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<402>";
	var t_y=10;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<403>";
	var t_gap=14;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<404>";
	bb_graphics_DrawText("Screen             = "+dbg_object(this.m_currentScreen).m_name,0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<405>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<406>";
	bb_graphics_DrawText("Delta              = "+bb_functions_FormatNumber(dbg_object(bb_framework_dt).m_delta,2,0,0),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<407>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<408>";
	bb_graphics_DrawText("Frame Time         = "+String(dbg_object(bb_framework_dt).m_frametime),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<409>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<410>";
	bb_graphics_DrawText("Screen Width       = "+String(bb_framework_SCREEN_WIDTH),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<411>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<412>";
	bb_graphics_DrawText("Screen Height      = "+String(bb_framework_SCREEN_HEIGHT),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<413>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<414>";
	bb_graphics_DrawText("VMouseX            = "+String(dbg_object(this).m_mouseX),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<415>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<416>";
	bb_graphics_DrawText("VMouseY            = "+String(dbg_object(this).m_mouseY),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<417>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<418>";
	bb_graphics_DrawText("MouseX             = "+String(bb_input_MouseX()),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<419>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<420>";
	bb_graphics_DrawText("MouseY             = "+String(bb_input_MouseY()),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<421>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<422>";
	bb_graphics_DrawText("Music File         = "+this.m_musicFile,0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<423>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<424>";
	bb_graphics_DrawText("MusicOkay          = "+String(this.m_musicOkay),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<425>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<426>";
	bb_graphics_DrawText("Music State        = "+String(bb_audio_MusicState()),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<427>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<428>";
	bb_graphics_DrawText("Music Volume       = "+String(dbg_object(this).m_musicVolume),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<429>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<430>";
	bb_graphics_DrawText("Mojo Music Volume  = "+String(dbg_object(this).m_mojoMusicVolume),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<431>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<432>";
	bb_graphics_DrawText("Sound Volume       = "+String(dbg_object(this).m_soundVolume),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<433>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<434>";
	bb_graphics_DrawText("Sound Channel      = "+String(c_SoundPlayer.m_channel),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<435>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<436>";
	bb_graphics_DrawText("Back Screen Name   = "+dbg_object(this.m_currentScreen).m_backScreenName,0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<437>";
	t_y+=t_gap;
	pop_err();
}
c_DiddyApp.prototype.p_DrawFPS=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<442>";
	bb_graphics_DrawText(String(c_FPSCounter.m_totalFPS),0.0,0.0,0.0,0.0);
	pop_err();
}
c_DiddyApp.prototype.p_OnRender=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<246>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<247>";
		c_FPSCounter.m_Update();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<248>";
		if(this.m_virtualResOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<249>";
			bb_graphics_PushMatrix();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<250>";
			if(this.m_aspectRatioOn){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<251>";
				if((bb_graphics_DeviceWidth())!=bb_framework_DEVICE_WIDTH || (bb_graphics_DeviceHeight())!=bb_framework_DEVICE_HEIGHT || ((this.m_deviceChanged)!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<252>";
					bb_framework_DEVICE_WIDTH=(bb_graphics_DeviceWidth());
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<253>";
					bb_framework_DEVICE_HEIGHT=(bb_graphics_DeviceHeight());
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<254>";
					this.m_deviceChanged=0;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<256>";
					var t_deviceRatio=bb_framework_DEVICE_HEIGHT/bb_framework_DEVICE_WIDTH;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<257>";
					if(t_deviceRatio>=this.m_aspectRatio){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<258>";
						this.m_multi=bb_framework_DEVICE_WIDTH/bb_framework_SCREEN_WIDTH;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<259>";
						this.m_heightBorder=(bb_framework_DEVICE_HEIGHT-bb_framework_SCREEN_HEIGHT*this.m_multi)*0.5;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<260>";
						this.m_widthBorder=0.0;
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<262>";
						this.m_multi=bb_framework_DEVICE_HEIGHT/bb_framework_SCREEN_HEIGHT;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<263>";
						this.m_widthBorder=(bb_framework_DEVICE_WIDTH-bb_framework_SCREEN_WIDTH*this.m_multi)*0.5;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<264>";
						this.m_heightBorder=0.0;
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<267>";
					this.m_vsx=bb_math_Max2(0.0,this.m_widthBorder);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<268>";
					this.m_vsy=bb_math_Max2(0.0,this.m_heightBorder);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<269>";
					this.m_vsw=bb_math_Min2(bb_framework_DEVICE_WIDTH-this.m_widthBorder*2.0,bb_framework_DEVICE_WIDTH);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<270>";
					this.m_vsh=bb_math_Min2(bb_framework_DEVICE_HEIGHT-this.m_heightBorder*2.0,bb_framework_DEVICE_HEIGHT);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<272>";
					this.m_virtualScaledW=bb_framework_SCREEN_WIDTH*this.m_multi;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<273>";
					this.m_virtualScaledH=bb_framework_SCREEN_HEIGHT*this.m_multi;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<275>";
					this.m_virtualXOff=(bb_framework_DEVICE_WIDTH-this.m_virtualScaledW)*0.5;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<276>";
					this.m_virtualYOff=(bb_framework_DEVICE_HEIGHT-this.m_virtualScaledH)*0.5;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<278>";
					this.m_virtualXOff=this.m_virtualXOff/this.m_multi;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<279>";
					this.m_virtualYOff=this.m_virtualYOff/this.m_multi;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<282>";
				bb_graphics_SetScissor(0.0,0.0,bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<283>";
				bb_graphics_Cls(0.0,0.0,0.0);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<285>";
				bb_graphics_SetScissor(this.m_vsx,this.m_vsy,this.m_vsw,this.m_vsh);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<287>";
				bb_graphics_Scale(this.m_multi,this.m_multi);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<289>";
				bb_graphics_Translate(this.m_virtualXOff,this.m_virtualYOff);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<291>";
				bb_graphics_Scale(bb_framework_SCREENX_RATIO,bb_framework_SCREENY_RATIO);
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<296>";
		if(this.m_autoCls){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<296>";
			bb_graphics_Cls(0.0,0.0,0.0);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<299>";
		this.m_currentScreen.p_RenderBackgroundLayers();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<300>";
		this.m_currentScreen.p_Render();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<301>";
		this.m_currentScreen.p_RenderForegroundLayers();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<303>";
		if(this.m_virtualResOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<304>";
			if(this.m_aspectRatioOn){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<305>";
				bb_graphics_SetScissor(0.0,0.0,bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<307>";
			bb_graphics_PopMatrix();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<310>";
		this.m_currentScreen.p_ExtraRender();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<311>";
		if(dbg_object(this.m_screenFade).m_active){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<311>";
			this.m_screenFade.p_Render();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<312>";
		this.m_currentScreen.p_DebugRender();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<313>";
		if(this.m_debugOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<314>";
			this.p_DrawDebug();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<316>";
		if(this.m_drawFPSOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<317>";
			this.p_DrawFPS();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<319>";
		this.m_diddyMouse.p_Update2();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,c_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<321>";
			print(t_e.p_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<322>";
			error(t_e.p_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<324>";
	pop_err();
	return 0;
}
c_DiddyApp.prototype.p_ReadInputs=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<328>";
	if(this.m_aspectRatioOn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<329>";
		var t_mouseOffsetX=bb_input_MouseX()-bb_framework_DEVICE_WIDTH*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<330>";
		var t_x=t_mouseOffsetX/this.m_multi/1.0+bb_framework_SCREEN_WIDTH*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<331>";
		this.m_mouseX=((t_x)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<332>";
		var t_mouseOffsetY=bb_input_MouseY()-bb_framework_DEVICE_HEIGHT*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<333>";
		var t_y=t_mouseOffsetY/this.m_multi/1.0+bb_framework_SCREEN_HEIGHT*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<334>";
		this.m_mouseY=((t_y)|0);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<336>";
		this.m_mouseX=((bb_input_MouseX()/bb_framework_SCREENX_RATIO)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<337>";
		this.m_mouseY=((bb_input_MouseY()/bb_framework_SCREENY_RATIO)|0);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<339>";
	this.m_mouseHit=bb_input_MouseHit(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<340>";
	this.m_inputCache.p_ReadInput();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<341>";
	this.m_inputCache.p_HandleEvents(this.m_currentScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<343>";
	if(this.m_debugKeyOn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<344>";
		if((bb_input_KeyHit(this.m_debugKey))!=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<345>";
			this.m_debugOn=!this.m_debugOn;
		}
	}
	pop_err();
}
c_DiddyApp.prototype.p_OverrideUpdate=function(){
	push_err();
	pop_err();
}
c_DiddyApp.prototype.p_SetMojoMusicVolume=function(t_volume){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<464>";
	if(t_volume<0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<464>";
		t_volume=0.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<465>";
	if(t_volume>1.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<465>";
		t_volume=1.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<466>";
	this.m_mojoMusicVolume=t_volume;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<467>";
	bb_audio_SetMusicVolume(this.m_mojoMusicVolume);
	pop_err();
}
c_DiddyApp.prototype.p_CalcAnimLength=function(t_ms){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<481>";
	var t_=(t_ms)/(1000.0/(this.m_FPS));
	pop_err();
	return t_;
}
c_DiddyApp.prototype.p_MusicPlay=function(t_file,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<447>";
	this.m_musicFile=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<449>";
	this.m_musicOkay=bb_audio_PlayMusic("music/"+this.m_musicFile,t_flags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<450>";
	if(this.m_musicOkay==-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<451>";
		print("Error Playing Music - Music must be in the data\\music folder");
	}
	pop_err();
}
c_DiddyApp.prototype.p_Update=function(t_fixedRateLogicDelta){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<389>";
	bb_framework_dt.p_UpdateDelta();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<390>";
	if(this.m_useFixedRateLogic){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<391>";
		dbg_object(bb_framework_dt).m_delta=t_fixedRateLogicDelta;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<394>";
	if(dbg_object(this.m_screenFade).m_active){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<394>";
		this.m_screenFade.p_Update2();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<395>";
	if(!dbg_object(this.m_screenFade).m_active || dbg_object(this.m_screenFade).m_allowScreenUpdate){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<395>";
		this.m_currentScreen.p_Update2();
	}
	pop_err();
}
c_DiddyApp.prototype.p_OnUpdate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<351>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<352>";
		this.p_ReadInputs();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<353>";
		this.p_OverrideUpdate();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<354>";
		if(this.m_useFixedRateLogic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<355>";
			var t_now=bb_app_Millisecs();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<356>";
			if((t_now)<this.m_lastTime){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<357>";
				this.m_numTicks=this.m_lastNumTicks;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<359>";
				this.m_tmpMs=(t_now)-this.m_lastTime;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<360>";
				if(this.m_tmpMs>(this.m_maxMs)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<360>";
					this.m_tmpMs=(this.m_maxMs);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<361>";
				this.m_numTicks=this.m_tmpMs/this.m_ms;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<364>";
			this.m_lastTime=(t_now);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<365>";
			this.m_lastNumTicks=this.m_numTicks;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<366>";
			for(var t_i=1;(t_i)<=Math.floor(this.m_numTicks);t_i=t_i+1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<367>";
				this.p_Update(1.0);
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<370>";
			var t_re=this.m_numTicks % 1.0;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<371>";
			if(t_re>0.0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<372>";
				this.p_Update(t_re);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<375>";
			this.p_Update(0.0);
		}
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,c_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<378>";
			print(t_e.p_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<379>";
			error(t_e.p_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<382>";
	pop_err();
	return 0;
}
c_DiddyApp.prototype.p_OnSuspend=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<515>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<516>";
		this.m_currentScreen.p_Suspend();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,c_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<518>";
			print(t_e.p_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<519>";
			error(t_e.p_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<521>";
	pop_err();
	return 0;
}
c_DiddyApp.prototype.p_OnResume=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<525>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<526>";
		dbg_object(bb_framework_dt).m_currentticks=(bb_app_Millisecs());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<527>";
		dbg_object(bb_framework_dt).m_lastticks=dbg_object(bb_framework_dt).m_currentticks;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<528>";
		this.m_currentScreen.p_Resume();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,c_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<530>";
			print(t_e.p_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<531>";
			error(t_e.p_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<533>";
	pop_err();
	return 0;
}
c_DiddyApp.prototype.p_OnBack=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<537>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<538>";
		this.m_currentScreen.p_Back();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,c_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<540>";
			print(t_e.p_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<541>";
			error(t_e.p_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<543>";
	pop_err();
	return 0;
}
function c_Game(){
	c_DiddyApp.call(this);
}
c_Game.prototype=extend_class(c_DiddyApp);
c_Game.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<9>";
	c_DiddyApp.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<9>";
	pop_err();
	return this;
}
c_Game.prototype.p_LoadImages=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<23>";
	var t_tmpImage=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<25>";
	this.m_images.p_LoadAtlas("bunny_character.xml",0,true,false,0,0,0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<26>";
	this.m_images.p_LoadAtlas("hunter_character.xml",0,true,false,0,0,0);
	pop_err();
}
c_Game.prototype.p_OnCreate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<11>";
	c_DiddyApp.prototype.p_OnCreate.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<13>";
	this.p_LoadImages();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<15>";
	bb_mainClass_titleScreen=c_TitleScreen.m_new.call(new c_TitleScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<16>";
	bb_mainClass_gameScreen=c_GameScreen.m_new.call(new c_GameScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<17>";
	bb_mainClass_titleScreen.p_PreStart();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<18>";
	pop_err();
	return 0;
}
var bb_app__app=null;
function c_GameDelegate(){
	BBGameDelegate.call(this);
	this.m__graphics=null;
	this.m__audio=null;
	this.m__input=null;
}
c_GameDelegate.prototype=extend_class(BBGameDelegate);
c_GameDelegate.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<24>";
	pop_err();
	return this;
}
c_GameDelegate.prototype.StartGame=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<33>";
	this.m__graphics=(new gxtkGraphics);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<34>";
	bb_graphics_SetGraphicsDevice(this.m__graphics);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<35>";
	bb_graphics_SetFont(null,32);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<37>";
	this.m__audio=(new gxtkAudio);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<38>";
	bb_audio_SetAudioDevice(this.m__audio);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<40>";
	this.m__input=c_InputDevice.m_new.call(new c_InputDevice);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<41>";
	bb_input_SetInputDevice(this.m__input);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<43>";
	bb_app__app.p_OnCreate();
	pop_err();
}
c_GameDelegate.prototype.SuspendGame=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<47>";
	bb_app__app.p_OnSuspend();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<48>";
	this.m__audio.Suspend();
	pop_err();
}
c_GameDelegate.prototype.ResumeGame=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<52>";
	this.m__audio.Resume();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<53>";
	bb_app__app.p_OnResume();
	pop_err();
}
c_GameDelegate.prototype.UpdateGame=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<57>";
	this.m__input.p_BeginUpdate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<58>";
	bb_app__app.p_OnUpdate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<59>";
	this.m__input.p_EndUpdate();
	pop_err();
}
c_GameDelegate.prototype.RenderGame=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<63>";
	var t_mode=this.m__graphics.BeginRender();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<64>";
	if((t_mode)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<64>";
		bb_graphics_BeginRender();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<65>";
	if(t_mode==2){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<65>";
		bb_app__app.p_OnLoading();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<65>";
		bb_app__app.p_OnRender();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<66>";
	if((t_mode)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<66>";
		bb_graphics_EndRender();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<67>";
	this.m__graphics.EndRender();
	pop_err();
}
c_GameDelegate.prototype.KeyEvent=function(t_event,t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<71>";
	this.m__input.p_KeyEvent(t_event,t_data);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<72>";
	if(t_event!=1){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<73>";
	var t_1=t_data;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<74>";
	if(t_1==432){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<75>";
		bb_app__app.p_OnClose();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<76>";
		if(t_1==416){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<77>";
			bb_app__app.p_OnBack();
		}
	}
	pop_err();
}
c_GameDelegate.prototype.MouseEvent=function(t_event,t_data,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<82>";
	this.m__input.p_MouseEvent(t_event,t_data,t_x,t_y);
	pop_err();
}
c_GameDelegate.prototype.TouchEvent=function(t_event,t_data,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<86>";
	this.m__input.p_TouchEvent(t_event,t_data,t_x,t_y);
	pop_err();
}
c_GameDelegate.prototype.MotionEvent=function(t_event,t_data,t_x,t_y,t_z){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<90>";
	this.m__input.p_MotionEvent(t_event,t_data,t_x,t_y,t_z);
	pop_err();
}
c_GameDelegate.prototype.DiscardGraphics=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<94>";
	this.m__graphics.DiscardGraphics();
	pop_err();
}
var bb_app__delegate=null;
var bb_app__game=null;
var bb_framework_diddyGame=null;
function c_Screen(){
	Object.call(this);
	this.m_name="";
	this.m_layers=null;
	this.m_backScreenName="";
	this.m_autoFadeIn=false;
	this.m_autoFadeInTime=50.0;
	this.m_autoFadeInSound=false;
	this.m_autoFadeInMusic=false;
	this.m_musicPath="";
	this.m_musicFlag=0;
}
c_Screen.m_new=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<768>";
	dbg_object(this).m_name=t_name;
	pop_err();
	return this;
}
c_Screen.prototype.p_RenderBackgroundLayers=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<807>";
	if((this.m_layers)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<808>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<808>";
		var t_=this.m_layers.p_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<808>";
		while(t_.p_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<808>";
			var t_layer=t_.p_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<809>";
			if(dbg_object(t_layer).m_index>=0){
				pop_err();
				return;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<810>";
			t_layer.p_Render2(0.0,0.0);
		}
	}
	pop_err();
}
c_Screen.prototype.p_Render=function(){
}
c_Screen.prototype.p_RenderForegroundLayers=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<816>";
	if((this.m_layers)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<817>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<817>";
		var t_=this.m_layers.p_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<817>";
		while(t_.p_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<817>";
			var t_layer=t_.p_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<818>";
			if(dbg_object(t_layer).m_index>=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<819>";
				t_layer.p_Render2(0.0,0.0);
			}
		}
	}
	pop_err();
}
c_Screen.prototype.p_ExtraRender=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_DebugRender=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnTouchHit=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnTouchClick=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnTouchFling=function(t_releaseX,t_releaseY,t_velocityX,t_velocityY,t_velocitySpeed,t_pointer){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnTouchReleased=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnTouchDragged=function(t_x,t_y,t_dx,t_dy,t_pointer){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnTouchLongPress=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnAnyKeyHit=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnKeyHit=function(t_key){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnAnyKeyDown=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnKeyDown=function(t_key){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnAnyKeyReleased=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnKeyReleased=function(t_key){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnMouseHit=function(t_x,t_y,t_button){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnMouseDown=function(t_x,t_y,t_button){
	push_err();
	pop_err();
}
c_Screen.prototype.p_OnMouseReleased=function(t_x,t_y,t_button){
	push_err();
	pop_err();
}
c_Screen.prototype.p_Kill=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_Start=function(){
}
c_Screen.prototype.p_PreStart=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<772>";
	dbg_object(bb_framework_diddyGame).m_screens.p_Set2(this.m_name,this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<773>";
	dbg_object(bb_framework_diddyGame).m_currentScreen=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<774>";
	if(this.m_autoFadeIn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<775>";
		this.m_autoFadeIn=false;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<776>";
		dbg_object(bb_framework_diddyGame).m_screenFade.p_Start2(this.m_autoFadeInTime,false,this.m_autoFadeInSound,this.m_autoFadeInMusic,true);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<780>";
	var t_tmpImage=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<781>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<781>";
	var t_=dbg_object(bb_framework_diddyGame).m_images.p_Keys().p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<781>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<781>";
		var t_key=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<782>";
		var t_i=dbg_object(bb_framework_diddyGame).m_images.p_Get(t_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<783>";
		if(dbg_object(t_i).m_preLoad && dbg_object(t_i).m_screenName.toUpperCase()==this.m_name.toUpperCase()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<784>";
			if(dbg_object(t_i).m_frames>1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<785>";
				t_i.p_LoadAnim(dbg_object(t_i).m_path,dbg_object(t_i).m_w,dbg_object(t_i).m_h,dbg_object(t_i).m_frames,t_tmpImage,dbg_object(t_i).m_midhandle,dbg_object(t_i).m_readPixels,dbg_object(t_i).m_maskRed,dbg_object(t_i).m_maskGreen,dbg_object(t_i).m_maskBlue,false,dbg_object(t_i).m_screenName);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<787>";
				t_i.p_Load(dbg_object(t_i).m_path,dbg_object(t_i).m_midhandle,dbg_object(t_i).m_readPixels,dbg_object(t_i).m_maskRed,dbg_object(t_i).m_maskGreen,dbg_object(t_i).m_maskBlue,false,dbg_object(t_i).m_screenName);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<793>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<793>";
	var t_2=dbg_object(bb_framework_diddyGame).m_sounds.p_Keys().p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<793>";
	while(t_2.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<793>";
		var t_key2=t_2.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<794>";
		var t_i2=dbg_object(bb_framework_diddyGame).m_sounds.p_Get(t_key2);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<795>";
		if(dbg_object(t_i2).m_preLoad && dbg_object(t_i2).m_screenName.toUpperCase()==this.m_name.toUpperCase()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<796>";
			t_i2.p_Load2(dbg_object(t_i2).m_path,false,dbg_object(t_i2).m_screenName);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<801>";
	if(this.m_musicPath!=""){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<801>";
		bb_framework_diddyGame.p_MusicPlay(this.m_musicPath,this.m_musicFlag);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<803>";
	this.p_Start();
	pop_err();
}
c_Screen.prototype.p_PostFadeOut=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<847>";
	this.p_Kill();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<848>";
	dbg_object(bb_framework_diddyGame).m_nextScreen.p_PreStart();
	pop_err();
}
c_Screen.prototype.p_PostFadeIn=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_Update2=function(){
}
c_Screen.prototype.p_Suspend=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_Resume=function(){
	push_err();
	pop_err();
}
c_Screen.prototype.p_FadeToScreen=function(t_screen,t_fadeTime,t_fadeSound,t_fadeMusic,t_allowScreenUpdate){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<926>";
	if(dbg_object(dbg_object(bb_framework_diddyGame).m_screenFade).m_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<929>";
	if(!((t_screen)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<929>";
		t_screen=(dbg_object(bb_framework_diddyGame).m_exitScreen);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<932>";
	dbg_object(t_screen).m_autoFadeIn=true;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<933>";
	dbg_object(t_screen).m_autoFadeInTime=t_fadeTime;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<934>";
	dbg_object(t_screen).m_autoFadeInSound=t_fadeSound;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<935>";
	dbg_object(t_screen).m_autoFadeInMusic=t_fadeMusic;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<938>";
	dbg_object(bb_framework_diddyGame).m_nextScreen=t_screen;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<939>";
	dbg_object(bb_framework_diddyGame).m_screenFade.p_Start2(t_fadeTime,true,t_fadeSound,t_fadeMusic,t_allowScreenUpdate);
	pop_err();
}
c_Screen.prototype.p_Back=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<832>";
	if(this.m_backScreenName=="exit"){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<833>";
		this.p_FadeToScreen(null,bb_framework_defaultFadeTime,false,false,true);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<834>";
		if((this.m_backScreenName).length!=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<835>";
			var t_scr=dbg_object(bb_framework_diddyGame).m_screens.p_Find(this.m_backScreenName);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<836>";
			if((t_scr)!=null){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<836>";
				this.p_FadeToScreen(t_scr,bb_framework_defaultFadeTime,false,false,true);
			}
		}
	}
	pop_err();
}
function c_Map2(){
	Object.call(this);
	this.m_root=null;
}
c_Map2.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
c_Map2.prototype.p_Compare=function(t_lhs,t_rhs){
}
c_Map2.prototype.p_RotateLeft2=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>";
	var t_child=dbg_object(t_node).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>";
	dbg_object(t_node).m_right=dbg_object(t_child).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>";
	if((dbg_object(t_child).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>";
		dbg_object(dbg_object(t_child).m_left).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>";
	dbg_object(t_child).m_left=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map2.prototype.p_RotateRight2=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>";
	var t_child=dbg_object(t_node).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>";
	dbg_object(t_node).m_left=dbg_object(t_child).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>";
	if((dbg_object(t_child).m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>";
		dbg_object(dbg_object(t_child).m_right).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>";
	dbg_object(t_child).m_right=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map2.prototype.p_InsertFixup2=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>";
	while(((dbg_object(t_node).m_parent)!=null) && dbg_object(dbg_object(t_node).m_parent).m_color==-1 && ((dbg_object(dbg_object(t_node).m_parent).m_parent)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>";
		if(dbg_object(t_node).m_parent==dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>";
			var t_uncle=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_right;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>";
			if(((t_uncle)!=null) && dbg_object(t_uncle).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>";
				dbg_object(t_uncle).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>";
				dbg_object(dbg_object(t_uncle).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>";
				t_node=dbg_object(t_uncle).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>";
					this.p_RotateLeft2(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>";
				this.p_RotateRight2(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>";
			var t_uncle2=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>";
			if(((t_uncle2)!=null) && dbg_object(t_uncle2).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>";
				dbg_object(t_uncle2).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>";
				dbg_object(dbg_object(t_uncle2).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>";
				t_node=dbg_object(t_uncle2).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>";
					this.p_RotateRight2(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>";
				this.p_RotateLeft2(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>";
	dbg_object(this.m_root).m_color=1;
	pop_err();
	return 0;
}
c_Map2.prototype.p_Set2=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_parent=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_cmp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>";
		t_parent=t_node;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>";
		t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>";
				dbg_object(t_node).m_value=t_value;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>";
				pop_err();
				return false;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>";
	t_node=c_Node3.m_new.call(new c_Node3,t_key,t_value,-1,t_parent);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>";
	if((t_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>";
			dbg_object(t_parent).m_right=t_node;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>";
			dbg_object(t_parent).m_left=t_node;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>";
		this.p_InsertFixup2(t_node);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>";
		this.m_root=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>";
	pop_err();
	return true;
}
c_Map2.prototype.p_Keys=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>";
	var t_=c_MapKeys3.m_new.call(new c_MapKeys3,this);
	pop_err();
	return t_;
}
c_Map2.prototype.p_FirstNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
	if(!((this.m_root)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>";
	while((dbg_object(t_node).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>";
		t_node=dbg_object(t_node).m_left;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>";
	pop_err();
	return t_node;
}
c_Map2.prototype.p_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>";
				pop_err();
				return t_node;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>";
	pop_err();
	return t_node;
}
c_Map2.prototype.p_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.p_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).m_value;
	}
	pop_err();
	return null;
}
function c_StringMap2(){
	c_Map2.call(this);
}
c_StringMap2.prototype=extend_class(c_Map2);
c_StringMap2.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	c_Map2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
c_StringMap2.prototype.p_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function c_Screens(){
	c_StringMap2.call(this);
}
c_Screens.prototype=extend_class(c_StringMap2);
c_Screens.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<555>";
	c_StringMap2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<555>";
	pop_err();
	return this;
}
c_Screens.prototype.p_Set2=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<557>";
	var t_=c_Map2.prototype.p_Set2.call(this,t_key.toUpperCase(),t_value);
	pop_err();
	return t_;
}
c_Screens.prototype.p_Find=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<561>";
	t_name=t_name.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<564>";
	if(dbg_object(bb_framework_diddyGame).m_debugOn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<565>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<565>";
		var t_=this.p_Keys().p_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<565>";
		while(t_.p_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<565>";
			var t_key=t_.p_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<566>";
			print(t_key+" is stored in the Screens map.");
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<570>";
	var t_i=this.p_Get(t_name);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<571>";
	bb_assert_AssertNotNull((t_i),"Screen '"+t_name+"' not found in the Screens map");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<572>";
	pop_err();
	return t_i;
}
function c_ExitScreen(){
	c_Screen.call(this);
}
c_ExitScreen.prototype=extend_class(c_Screen);
c_ExitScreen.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<734>";
	c_Screen.m_new.call(this,"exit");
	pop_err();
	return this;
}
c_ExitScreen.prototype.p_Start=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<738>";
	bb_functions_ExitApp();
	pop_err();
}
c_ExitScreen.prototype.p_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<742>";
	bb_graphics_Cls(0.0,0.0,0.0);
	pop_err();
}
c_ExitScreen.prototype.p_Update2=function(){
	push_err();
	pop_err();
}
function c_LoadingScreen(){
	c_Screen.call(this);
	this.m_loadingBar=null;
	this.m_finished=false;
	this.m_destination=null;
	this.m_image=null;
}
c_LoadingScreen.prototype=extend_class(c_Screen);
c_LoadingScreen.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<694>";
	c_Screen.m_new.call(this,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<695>";
	this.m_name="loading";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<696>";
	this.m_loadingBar=c_LoadingBar.m_new.call(new c_LoadingBar);
	pop_err();
	return this;
}
c_LoadingScreen.prototype.p_Start=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<711>";
	this.m_finished=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<712>";
	if(this.m_destination==null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<712>";
		error("Loading Screen Destination is null!");
	}
	pop_err();
}
c_LoadingScreen.prototype.p_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<716>";
	bb_graphics_Cls(0.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<717>";
	bb_graphics_DrawImage(this.m_image,bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2,0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<718>";
	this.m_loadingBar.p_Draw();
	pop_err();
}
c_LoadingScreen.prototype.p_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<722>";
	if((bb_input_KeyHit(32))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<723>";
		this.m_loadingBar.p_Progress();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<725>";
	if(dbg_object(this.m_loadingBar).m_finished){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<726>";
		this.p_FadeToScreen(this.m_destination,bb_framework_defaultFadeTime,false,false,true);
	}
	pop_err();
}
function c_LoadingBar(){
	Object.call(this);
	this.m_emptyImage=null;
	this.m_x=0;
	this.m_y=0;
	this.m_fullImage=null;
	this.m_position=.0;
	this.m_currentStep=0;
	this.m_stepSize=.0;
	this.m_steps=.0;
	this.m_finished=false;
}
c_LoadingBar.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<659>";
	pop_err();
	return this;
}
c_LoadingBar.prototype.p_Draw=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<682>";
	bb_graphics_DrawImage(this.m_emptyImage,(this.m_x),(this.m_y),0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<683>";
	bb_graphics_DrawImageRect(this.m_fullImage,(this.m_x),(this.m_y),0,0,((this.m_position)|0),this.m_fullImage.p_Height(),0);
	pop_err();
}
c_LoadingBar.prototype.p_Progress=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<675>";
	this.m_currentStep=this.m_currentStep+1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<676>";
	this.m_position=(this.m_currentStep)*this.m_stepSize;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<677>";
	if(this.m_position>(this.m_fullImage.p_Width())){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<677>";
		this.m_position=(this.m_fullImage.p_Width());
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<678>";
	if((this.m_currentStep)==this.m_steps){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<678>";
		this.m_finished=true;
	}
	pop_err();
}
function c_ScreenFade(){
	Object.call(this);
	this.m_active=false;
	this.m_ratio=0.0;
	this.m_counter=.0;
	this.m_fadeTime=.0;
	this.m_fadeMusic=false;
	this.m_fadeOut=false;
	this.m_fadeSound=false;
	this.m_allowScreenUpdate=false;
}
c_ScreenFade.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<577>";
	pop_err();
	return this;
}
c_ScreenFade.prototype.p_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<649>";
	if(!this.m_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<650>";
	bb_graphics_SetAlpha(1.0-this.m_ratio);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<651>";
	bb_graphics_SetColor(0.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<652>";
	bb_graphics_DrawRect(0.0,0.0,bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<653>";
	bb_graphics_SetAlpha(1.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<654>";
	bb_graphics_SetColor(255.0,255.0,255.0);
	pop_err();
}
c_ScreenFade.prototype.p_CalcRatio=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<630>";
	this.m_ratio=this.m_counter/this.m_fadeTime;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<631>";
	if(this.m_ratio<0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<632>";
		this.m_ratio=0.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<633>";
		if(this.m_fadeMusic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<634>";
			bb_framework_diddyGame.p_SetMojoMusicVolume(0.0);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<637>";
	if(this.m_ratio>1.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<638>";
		this.m_ratio=1.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<639>";
		if(this.m_fadeMusic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<640>";
			bb_framework_diddyGame.p_SetMojoMusicVolume((dbg_object(bb_framework_diddyGame).m_musicVolume)/100.0);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<643>";
	if(this.m_fadeOut){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<644>";
		this.m_ratio=1.0-this.m_ratio;
	}
	pop_err();
}
c_ScreenFade.prototype.p_Start2=function(t_fadeTime,t_fadeOut,t_fadeSound,t_fadeMusic,t_allowScreenUpdate){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<588>";
	if(this.m_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<589>";
	this.m_active=true;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<590>";
	dbg_object(this).m_fadeTime=bb_framework_diddyGame.p_CalcAnimLength((t_fadeTime)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<591>";
	dbg_object(this).m_fadeOut=t_fadeOut;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<592>";
	dbg_object(this).m_fadeMusic=t_fadeMusic;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<593>";
	dbg_object(this).m_fadeSound=t_fadeSound;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<594>";
	dbg_object(this).m_allowScreenUpdate=t_allowScreenUpdate;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<595>";
	if(t_fadeOut){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<596>";
		this.m_ratio=1.0;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<598>";
		this.m_ratio=0.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<600>";
		if(dbg_object(this).m_fadeMusic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<601>";
			bb_framework_diddyGame.p_SetMojoMusicVolume(0.0);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<604>";
	this.m_counter=0.0;
	pop_err();
}
c_ScreenFade.prototype.p_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<608>";
	if(!this.m_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<609>";
	this.m_counter+=dbg_object(bb_framework_dt).m_delta;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<610>";
	this.p_CalcRatio();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<611>";
	if(this.m_fadeSound){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<612>";
		for(var t_i=0;t_i<=31;t_i=t_i+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<613>";
			bb_audio_SetChannelVolume(t_i,this.m_ratio*((dbg_object(bb_framework_diddyGame).m_soundVolume)/100.0));
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<616>";
	if(this.m_fadeMusic){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<617>";
		bb_framework_diddyGame.p_SetMojoMusicVolume(this.m_ratio*((dbg_object(bb_framework_diddyGame).m_musicVolume)/100.0));
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<619>";
	if(this.m_counter>this.m_fadeTime){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<620>";
		this.m_active=false;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<621>";
		if(this.m_fadeOut){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<622>";
			dbg_object(bb_framework_diddyGame).m_currentScreen.p_PostFadeOut();
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<624>";
			dbg_object(bb_framework_diddyGame).m_currentScreen.p_PostFadeIn();
		}
	}
	pop_err();
}
function c_GameImage(){
	Object.call(this);
	this.m_image=null;
	this.m_w=0;
	this.m_h=0;
	this.m_preLoad=false;
	this.m_screenName="";
	this.m_frames=0;
	this.m_path="";
	this.m_midhandle=false;
	this.m_readPixels=false;
	this.m_maskRed=0;
	this.m_maskGreen=0;
	this.m_maskBlue=0;
	this.m_name="";
	this.m_w2=.0;
	this.m_h2=.0;
	this.m_midhandled=0;
	this.m_pixels=[];
	this.m_atlasName="";
	this.m_subX=0;
	this.m_subY=0;
	this.m_tileMargin=0;
	this.m_tileWidth=0;
	this.m_tileSpacing=0;
	this.m_tileCountX=0;
	this.m_tileHeight=0;
	this.m_tileCountY=0;
	this.m_tileCount=0;
}
c_GameImage.prototype.p_Draw2=function(t_x,t_y,t_rotation,t_scaleX,t_scaleY,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1448>";
	bb_graphics_DrawImage2(dbg_object(this).m_image,t_x,t_y,t_rotation,t_scaleX,t_scaleY,t_frame);
	pop_err();
}
c_GameImage.prototype.p_CalcSize=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1421>";
	if(this.m_image!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1422>";
		this.m_w=this.m_image.p_Width();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1423>";
		this.m_h=this.m_image.p_Height();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1424>";
		this.m_w2=((this.m_w/2)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1425>";
		this.m_h2=((this.m_h/2)|0);
	}
	pop_err();
}
c_GameImage.prototype.p_MidHandle=function(t_midhandle){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1430>";
	if(t_midhandle){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1431>";
		this.m_image.p_SetHandle(this.m_w2,this.m_h2);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1432>";
		dbg_object(this).m_midhandled=1;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1434>";
		this.m_image.p_SetHandle(0.0,0.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1435>";
		dbg_object(this).m_midhandled=0;
	}
	pop_err();
}
c_GameImage.prototype.p_MidHandle2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1444>";
	var t_=dbg_object(this).m_midhandled==1;
	pop_err();
	return t_;
}
c_GameImage.prototype.p_SetMaskColor=function(t_r,t_g,t_b){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1366>";
	this.m_maskRed=t_r;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1367>";
	this.m_maskGreen=t_g;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1368>";
	this.m_maskBlue=t_b;
	pop_err();
}
c_GameImage.prototype.p_LoadAnim=function(t_file,t_w,t_h,t_total,t_tmpImage,t_midhandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue,t_preLoad,t_screenName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1388>";
	this.m_name=bb_functions_StripAll(t_file.toUpperCase());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1389>";
	this.m_path=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1390>";
	dbg_object(this).m_midhandle=t_midhandle;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1391>";
	dbg_object(this).m_preLoad=t_preLoad;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1392>";
	dbg_object(this).m_screenName=t_screenName.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1393>";
	dbg_object(this).m_w=t_w;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1394>";
	dbg_object(this).m_h=t_h;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1395>";
	dbg_object(this).m_frames=t_total;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1396>";
	if(!t_preLoad){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1397>";
		this.m_image=bb_functions_LoadAnimBitmap(t_file,t_w,t_h,t_total,t_tmpImage);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1398>";
		this.p_CalcSize();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1399>";
		this.p_MidHandle(t_midhandle);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1400>";
		this.m_pixels=new_number_array(this.m_image.p_Width()*this.m_image.p_Height());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1401>";
		dbg_object(this).m_readPixels=t_readPixels;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1403>";
	this.p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
	pop_err();
}
c_GameImage.prototype.p_Load=function(t_file,t_midhandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue,t_preLoad,t_screenName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1372>";
	this.m_name=bb_functions_StripAll(t_file.toUpperCase());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1373>";
	this.m_path=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1374>";
	dbg_object(this).m_midhandle=t_midhandle;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1375>";
	dbg_object(this).m_preLoad=t_preLoad;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1376>";
	dbg_object(this).m_screenName=t_screenName.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1377>";
	if(!t_preLoad){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1378>";
		this.m_image=bb_functions_LoadBitmap(t_file,0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1379>";
		this.p_CalcSize();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1380>";
		this.p_MidHandle(t_midhandle);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1381>";
		this.m_pixels=new_number_array(this.m_image.p_Width()*this.m_image.p_Height());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1382>";
		dbg_object(this).m_readPixels=t_readPixels;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1384>";
	this.p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
	pop_err();
}
c_GameImage.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1316>";
	pop_err();
	return this;
}
c_GameImage.prototype.p_DrawTile=function(t_x,t_y,t_tile,t_rotation,t_scaleX,t_scaleY){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1456>";
	var t_srcX=this.m_tileMargin+(this.m_tileWidth+this.m_tileSpacing)*(t_tile % this.m_tileCountX);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1457>";
	var t_srcY=this.m_tileMargin+(this.m_tileHeight+this.m_tileSpacing)*((t_tile/this.m_tileCountX)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1458>";
	bb_graphics_DrawImageRect2(dbg_object(this).m_image,t_x,t_y,t_srcX,t_srcY,this.m_tileWidth,this.m_tileHeight,t_rotation,t_scaleX,t_scaleY,0);
	pop_err();
}
c_GameImage.prototype.p_LoadTileset=function(t_file,t_tileWidth,t_tileHeight,t_tileMargin,t_tileSpacing,t_midhandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1407>";
	this.p_Load(t_file,t_midhandle,false,0,0,0,false,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1408>";
	dbg_object(this).m_tileWidth=t_tileWidth;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1409>";
	dbg_object(this).m_tileHeight=t_tileHeight;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1410>";
	dbg_object(this).m_tileMargin=t_tileMargin;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1411>";
	dbg_object(this).m_tileSpacing=t_tileSpacing;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1412>";
	this.m_tileCountX=(((this.m_w-t_tileMargin)/(t_tileWidth+t_tileSpacing))|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1413>";
	this.m_tileCountY=(((this.m_h-t_tileMargin)/(t_tileHeight+t_tileSpacing))|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1414>";
	this.m_tileCount=this.m_tileCountX*this.m_tileCountY;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1415>";
	this.m_pixels=new_number_array(this.m_image.p_Width()*this.m_image.p_Height());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1416>";
	dbg_object(this).m_readPixels=t_readPixels;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1417>";
	this.p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
	pop_err();
}
function c_Map3(){
	Object.call(this);
	this.m_root=null;
}
c_Map3.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
c_Map3.prototype.p_Keys=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>";
	var t_=c_MapKeys.m_new.call(new c_MapKeys,this);
	pop_err();
	return t_;
}
c_Map3.prototype.p_FirstNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
	if(!((this.m_root)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>";
	while((dbg_object(t_node).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>";
		t_node=dbg_object(t_node).m_left;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>";
	pop_err();
	return t_node;
}
c_Map3.prototype.p_Compare=function(t_lhs,t_rhs){
}
c_Map3.prototype.p_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>";
				pop_err();
				return t_node;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>";
	pop_err();
	return t_node;
}
c_Map3.prototype.p_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.p_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).m_value;
	}
	pop_err();
	return null;
}
c_Map3.prototype.p_RotateLeft3=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>";
	var t_child=dbg_object(t_node).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>";
	dbg_object(t_node).m_right=dbg_object(t_child).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>";
	if((dbg_object(t_child).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>";
		dbg_object(dbg_object(t_child).m_left).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>";
	dbg_object(t_child).m_left=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map3.prototype.p_RotateRight3=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>";
	var t_child=dbg_object(t_node).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>";
	dbg_object(t_node).m_left=dbg_object(t_child).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>";
	if((dbg_object(t_child).m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>";
		dbg_object(dbg_object(t_child).m_right).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>";
	dbg_object(t_child).m_right=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map3.prototype.p_InsertFixup3=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>";
	while(((dbg_object(t_node).m_parent)!=null) && dbg_object(dbg_object(t_node).m_parent).m_color==-1 && ((dbg_object(dbg_object(t_node).m_parent).m_parent)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>";
		if(dbg_object(t_node).m_parent==dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>";
			var t_uncle=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_right;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>";
			if(((t_uncle)!=null) && dbg_object(t_uncle).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>";
				dbg_object(t_uncle).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>";
				dbg_object(dbg_object(t_uncle).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>";
				t_node=dbg_object(t_uncle).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>";
					this.p_RotateLeft3(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>";
				this.p_RotateRight3(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>";
			var t_uncle2=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>";
			if(((t_uncle2)!=null) && dbg_object(t_uncle2).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>";
				dbg_object(t_uncle2).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>";
				dbg_object(dbg_object(t_uncle2).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>";
				t_node=dbg_object(t_uncle2).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>";
					this.p_RotateRight3(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>";
				this.p_RotateLeft3(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>";
	dbg_object(this.m_root).m_color=1;
	pop_err();
	return 0;
}
c_Map3.prototype.p_Set3=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_parent=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_cmp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>";
		t_parent=t_node;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>";
		t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>";
				dbg_object(t_node).m_value=t_value;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>";
				pop_err();
				return false;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>";
	t_node=c_Node2.m_new.call(new c_Node2,t_key,t_value,-1,t_parent);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>";
	if((t_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>";
			dbg_object(t_parent).m_right=t_node;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>";
			dbg_object(t_parent).m_left=t_node;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>";
		this.p_InsertFixup3(t_node);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>";
		this.m_root=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>";
	pop_err();
	return true;
}
c_Map3.prototype.p_Contains=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>";
	var t_=this.p_FindNode(t_key)!=null;
	pop_err();
	return t_;
}
function c_StringMap3(){
	c_Map3.call(this);
}
c_StringMap3.prototype=extend_class(c_Map3);
c_StringMap3.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	c_Map3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
c_StringMap3.prototype.p_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function c_ImageBank(){
	c_StringMap3.call(this);
	this.m_path="graphics/";
}
c_ImageBank.prototype=extend_class(c_StringMap3);
c_ImageBank.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<993>";
	c_StringMap3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<993>";
	pop_err();
	return this;
}
c_ImageBank.prototype.p_Find=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1256>";
	t_name=t_name.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1259>";
	if(dbg_object(bb_framework_diddyGame).m_debugOn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1260>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1260>";
		var t_=this.p_Keys().p_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1260>";
		while(t_.p_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1260>";
			var t_key=t_.p_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1261>";
			var t_i=this.p_Get(t_key);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1262>";
			if(!dbg_object(t_i).m_preLoad){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1263>";
				print(t_key+" is stored in the image map.");
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1267>";
	var t_i2=this.p_Get(t_name);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1268>";
	bb_assert_AssertNotNull((t_i2),"Image '"+t_name+"' not found in the ImageBank");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1269>";
	if(dbg_object(t_i2).m_preLoad && dbg_object(t_i2).m_image==null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1269>";
		bb_assert_AssertError("Image '"+t_name+"' not found in the ImageBank");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1270>";
	pop_err();
	return t_i2;
}
c_ImageBank.prototype.p_LoadAtlasString=function(t_fileName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1014>";
	var t_str=bb_app_LoadString(this.m_path+t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1016>";
	bb_assert_AssertNotEqualInt(t_str.length,0,"Error loading Atlas "+this.m_path+t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1017>";
	pop_err();
	return t_str;
}
c_ImageBank.prototype.p_SaveAtlasToBank=function(t_pointer,t_fileName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1022>";
	var t_atlasGameImage=c_GameImage.m_new.call(new c_GameImage);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1023>";
	dbg_object(t_atlasGameImage).m_name="_diddyAtlas_"+bb_functions_StripAll(t_fileName).toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1024>";
	dbg_object(t_atlasGameImage).m_image=t_pointer;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1025>";
	t_atlasGameImage.p_CalcSize();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1026>";
	this.p_Set3(dbg_object(t_atlasGameImage).m_name,t_atlasGameImage);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1027>";
	pop_err();
	return dbg_object(t_atlasGameImage).m_name;
}
c_ImageBank.prototype.p_LoadSparrowAtlas=function(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1173>";
	var t_str=this.p_LoadAtlasString(t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1175>";
	var t_parser=c_XMLParser.m_new.call(new c_XMLParser);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1176>";
	var t_doc=t_parser.p_ParseString(t_str);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1177>";
	var t_rootElement=t_doc.p_Root();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1178>";
	var t_spriteFileName=t_rootElement.p_GetAttribute("imagePath","");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1180>";
	var t_pointer=bb_graphics_LoadImage(this.m_path+t_spriteFileName,1,c_Image.m_DefaultFlags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1181>";
	bb_assert_AssertNotNull((t_pointer),"Error loading bitmap atlas "+this.m_path+t_spriteFileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1183>";
	var t_atlasGameImageName=this.p_SaveAtlasToBank(t_pointer,t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1185>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1185>";
	var t_=t_rootElement.p_GetChildrenByName("SubTexture","","","","","","","","","","").p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1185>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1185>";
		var t_node=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1186>";
		var t_x=parseInt((string_trim(t_node.p_GetAttribute("x",""))),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1187>";
		var t_y=parseInt((string_trim(t_node.p_GetAttribute("y",""))),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1188>";
		var t_width=parseInt((string_trim(t_node.p_GetAttribute("width",""))),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1189>";
		var t_height=parseInt((string_trim(t_node.p_GetAttribute("height",""))),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1190>";
		var t_name=string_trim(t_node.p_GetAttribute("name",""));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1192>";
		var t_gi=c_GameImage.m_new.call(new c_GameImage);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1193>";
		dbg_object(t_gi).m_name=t_name.toUpperCase();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1194>";
		dbg_object(t_gi).m_image=t_pointer.p_GrabImage(t_x,t_y,t_width,t_height,1,c_Image.m_DefaultFlags);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1195>";
		t_gi.p_CalcSize();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1196>";
		t_gi.p_MidHandle(t_midHandle);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1198>";
		dbg_object(t_gi).m_atlasName=t_atlasGameImageName;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1199>";
		dbg_object(t_gi).m_subX=t_x;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1200>";
		dbg_object(t_gi).m_subY=t_y;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1201>";
		dbg_object(t_gi).m_readPixels=t_readPixels;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1202>";
		t_gi.p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1203>";
		this.p_Set3(dbg_object(t_gi).m_name,t_gi);
	}
	pop_err();
}
c_ImageBank.prototype.p_LoadLibGdxAtlas=function(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1031>";
	var t_str=this.p_LoadAtlasString(t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1032>";
	var t_all=t_str.split("\n");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1033>";
	var t_spriteFileName=string_trim(dbg_array(t_all,0)[dbg_index]);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1034>";
	var t_pointer=bb_graphics_LoadImage(this.m_path+t_spriteFileName,1,c_Image.m_DefaultFlags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1035>";
	bb_assert_AssertNotNull((t_pointer),"Error loading bitmap atlas "+this.m_path+t_spriteFileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1036>";
	var t_atlasGameImageName=this.p_SaveAtlasToBank(t_pointer,t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1038>";
	var t_line="";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1039>";
	var t_i=4;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1040>";
	var t_xy=["",""];
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1041>";
	var t_debug=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1042>";
	while(true){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1044>";
		t_line=string_trim(dbg_array(t_all,t_i)[dbg_index]);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1045>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1045>";
			print("name = "+t_line);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1046>";
		if(t_line==""){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1046>";
			break;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1047>";
		var t_name=t_line;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1049>";
		t_i+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1050>";
		t_line=string_trim(dbg_array(t_all,t_i)[dbg_index]);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1051>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1051>";
			print("rotate = "+t_line);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1052>";
		var t_rotate=t_line;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1054>";
		t_i+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1055>";
		t_line=string_trim(dbg_array(t_all,t_i)[dbg_index]);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1056>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1056>";
			print("x and y = "+t_line);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1057>";
		t_xy=t_line.slice(t_line.lastIndexOf(":")+1).split(",");
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1058>";
		var t_x=parseInt((string_trim(dbg_array(t_xy,0)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1059>";
		var t_y=parseInt((string_trim(dbg_array(t_xy,1)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1061>";
		t_i+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1062>";
		t_line=string_trim(dbg_array(t_all,t_i)[dbg_index]);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1063>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1063>";
			print("width and height = "+t_line);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1064>";
		t_xy=t_line.slice(t_line.lastIndexOf(":")+1).split(",");
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1065>";
		var t_width=parseInt((string_trim(dbg_array(t_xy,0)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1066>";
		var t_height=parseInt((string_trim(dbg_array(t_xy,1)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1068>";
		t_i+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1069>";
		t_line=string_trim(dbg_array(t_all,t_i)[dbg_index]);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1070>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1070>";
			print("origX and origY = "+t_line);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1071>";
		t_xy=t_line.slice(t_line.lastIndexOf(":")+1).split(",");
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1072>";
		var t_origX=parseInt((string_trim(dbg_array(t_xy,0)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1073>";
		var t_origY=parseInt((string_trim(dbg_array(t_xy,1)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1075>";
		t_i+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1076>";
		t_line=string_trim(dbg_array(t_all,t_i)[dbg_index]);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1077>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1077>";
			print("offsets = "+t_line);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1078>";
		t_xy=t_line.slice(t_line.lastIndexOf(":")+1).split(",");
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1079>";
		var t_offsetX=parseInt((string_trim(dbg_array(t_xy,0)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1080>";
		var t_offsetY=parseInt((string_trim(dbg_array(t_xy,1)[dbg_index])),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1082>";
		t_i+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1083>";
		t_line=string_trim(dbg_array(t_all,t_i)[dbg_index]);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1084>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1084>";
			print("index = "+t_line);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1085>";
		var t_index=parseInt((string_trim(t_line.slice(t_line.lastIndexOf(":")+1))),10);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1086>";
		t_i+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1087>";
		var t_gi=c_GameImage.m_new.call(new c_GameImage);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1088>";
		if(t_index>-1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1089>";
			t_name=t_name+String(t_index);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1091>";
		if(t_debug){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1092>";
			print("name    = "+t_name);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1093>";
			print("x       = "+String(t_x));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1094>";
			print("y       = "+String(t_y));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1095>";
			print("width   = "+String(t_width));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1096>";
			print("height  = "+String(t_height));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1097>";
			print("origX   = "+String(t_origX));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1098>";
			print("origY   = "+String(t_origY));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1099>";
			print("offsetX = "+String(t_offsetX));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1100>";
			print("offsetY = "+String(t_offsetY));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1101>";
			print("index   = "+String(t_index));
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1104>";
		dbg_object(t_gi).m_name=t_name.toUpperCase();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1105>";
		dbg_object(t_gi).m_image=t_pointer.p_GrabImage(t_x,t_y,t_width,t_height,1,c_Image.m_DefaultFlags);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1106>";
		t_gi.p_CalcSize();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1107>";
		t_gi.p_MidHandle(t_midHandle);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1109>";
		dbg_object(t_gi).m_atlasName=t_atlasGameImageName;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1110>";
		dbg_object(t_gi).m_subX=t_x;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1111>";
		dbg_object(t_gi).m_subY=t_y;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1112>";
		dbg_object(t_gi).m_readPixels=t_readPixels;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1113>";
		t_gi.p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1115>";
		this.p_Set3(dbg_object(t_gi).m_name,t_gi);
	}
	pop_err();
}
c_ImageBank.prototype.p_LoadJsonAtlas=function(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1121>";
	var t_str=this.p_LoadAtlasString(t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1123>";
	var t_jso=c_JsonObject.m_new3.call(new c_JsonObject,t_str);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1125>";
	var t_meta=object_downcast((t_jso.p_Get3("meta",null)),c_JsonObject);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1126>";
	var t_image=t_meta.p_Get3("image",null);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1127>";
	var t_spriteFileName=t_image.p_StringValue();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1129>";
	var t_pointer=bb_graphics_LoadImage(this.m_path+t_spriteFileName,1,c_Image.m_DefaultFlags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1130>";
	bb_assert_AssertNotNull((t_pointer),"Error loading bitmap atlas "+this.m_path+t_spriteFileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1132>";
	var t_atlasGameImageName=this.p_SaveAtlasToBank(t_pointer,t_fileName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1134>";
	var t_sprs=object_downcast((t_jso.p_Get3("frames",null)),c_JsonObject);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1135>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1135>";
	var t_=t_sprs.p_GetData().p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1135>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1135>";
		var t_it=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1136>";
		var t_name=t_it.p_Key();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1138>";
		var t_spr=object_downcast((t_it.p_Value()),c_JsonObject);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1139>";
		var t_frame=object_downcast((t_spr.p_Get3("frame",null)),c_JsonObject);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1140>";
		var t_x=t_frame.p_GetInt("x",0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1141>";
		var t_y=t_frame.p_GetInt("y",0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1142>";
		var t_w=t_frame.p_GetInt("w",0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1143>";
		var t_h=t_frame.p_GetInt("h",0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1145>";
		var t_rotated=t_spr.p_Get3("rotated",null);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1148>";
		var t_trimmed=t_spr.p_Get3("trimmed",null);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1151>";
		var t_spriteSourceSize=object_downcast((t_spr.p_Get3("spriteSourceSize",null)),c_JsonObject);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1154>";
		var t_sourceSize=object_downcast((t_spr.p_Get3("sourceSize",null)),c_JsonObject);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1157>";
		var t_gi=c_GameImage.m_new.call(new c_GameImage);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1158>";
		dbg_object(t_gi).m_name=t_name.toUpperCase();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1159>";
		dbg_object(t_gi).m_image=t_pointer.p_GrabImage(t_x,t_y,t_w,t_h,1,c_Image.m_DefaultFlags);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1160>";
		t_gi.p_CalcSize();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1161>";
		t_gi.p_MidHandle(t_midHandle);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1163>";
		dbg_object(t_gi).m_atlasName=t_atlasGameImageName;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1164>";
		dbg_object(t_gi).m_subX=t_x;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1165>";
		dbg_object(t_gi).m_subY=t_y;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1166>";
		dbg_object(t_gi).m_readPixels=t_readPixels;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1167>";
		t_gi.p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1168>";
		this.p_Set3(dbg_object(t_gi).m_name,t_gi);
	}
	pop_err();
}
c_ImageBank.prototype.p_LoadAtlas=function(t_fileName,t_format,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1002>";
	if(t_format==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1003>";
		this.p_LoadSparrowAtlas(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1004>";
		if(t_format==1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1005>";
			this.p_LoadLibGdxAtlas(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1006>";
			if(t_format==2){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1007>";
				this.p_LoadJsonAtlas(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1009>";
				error("Invalid atlas format");
			}
		}
	}
	pop_err();
}
c_ImageBank.prototype.p_FindSet=function(t_name,t_w,t_h,t_frames,t_midhandle,t_nameoverride){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1281>";
	t_name=t_name.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1282>";
	var t_subImage=this.p_Get(t_name);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1283>";
	bb_assert_AssertNotNull((t_subImage),"Image '"+t_name+"' not found in the ImageBank");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1284>";
	var t_atlasGameImage=this.p_Get(dbg_object(t_subImage).m_atlasName);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1285>";
	bb_assert_AssertNotNull((t_atlasGameImage),"Atlas Image '"+t_name+"' not found in the ImageBank");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1286>";
	var t_image=dbg_object(t_atlasGameImage).m_image.p_GrabImage(dbg_object(t_subImage).m_subX,dbg_object(t_subImage).m_subY,t_w,t_h,t_frames,c_Image.m_DefaultFlags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1288>";
	var t_gi=c_GameImage.m_new.call(new c_GameImage);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1289>";
	var t_storeKey=t_nameoverride.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1290>";
	if(t_storeKey==""){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1290>";
		t_storeKey=t_name.toUpperCase();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1291>";
	dbg_object(t_gi).m_name=t_storeKey;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1292>";
	dbg_object(t_gi).m_image=t_image;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1293>";
	t_gi.p_CalcSize();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1294>";
	t_gi.p_MidHandle(t_midhandle);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1295>";
	pop_err();
	return t_gi;
}
c_ImageBank.prototype.p_LoadTileset2=function(t_name,t_tileWidth,t_tileHeight,t_tileMargin,t_tileSpacing,t_nameoverride,t_midhandle,t_ignoreCache,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1240>";
	var t_storeKey=t_nameoverride.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1241>";
	if(t_storeKey==""){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1241>";
		t_storeKey=bb_functions_StripAll(t_name.toUpperCase());
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1242>";
	if(!t_ignoreCache && this.p_Contains(t_storeKey)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1242>";
		var t_=this.p_Get(t_storeKey);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1245>";
	if(this.p_Contains(t_storeKey)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1245>";
		dbg_object(this.p_Get(t_storeKey)).m_image.p_Discard();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1248>";
	var t_i=c_GameImage.m_new.call(new c_GameImage);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1249>";
	t_i.p_LoadTileset(this.m_path+t_name,t_tileWidth,t_tileHeight,t_tileMargin,t_tileSpacing,t_midhandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1250>";
	dbg_object(t_i).m_name=t_storeKey;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1251>";
	this.p_Set3(dbg_object(t_i).m_name,t_i);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1252>";
	pop_err();
	return t_i;
}
function c_GameSound(){
	Object.call(this);
	this.m_preLoad=false;
	this.m_screenName="";
	this.m_path="";
	this.m_sound=null;
	this.m_name="";
}
c_GameSound.prototype.p_Load2=function(t_file,t_preLoad,t_screenName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1652>";
	dbg_object(this).m_path=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1653>";
	dbg_object(this).m_preLoad=t_preLoad;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1654>";
	dbg_object(this).m_screenName=t_screenName;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1655>";
	if(!t_preLoad){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1656>";
		if((t_file.indexOf(".wav")!=-1) || (t_file.indexOf(".ogg")!=-1) || (t_file.indexOf(".mp3")!=-1) || (t_file.indexOf(".m4a")!=-1) || (t_file.indexOf(".wma")!=-1)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1657>";
			this.m_sound=bb_functions_LoadSoundSample(c_SoundBank.m_path+t_file);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1664>";
			this.m_sound=bb_functions_LoadSoundSample(c_SoundBank.m_path+t_file+".wav");
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1668>";
	this.m_name=bb_functions_StripAll(t_file.toUpperCase());
	pop_err();
}
function c_Map4(){
	Object.call(this);
	this.m_root=null;
}
c_Map4.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
c_Map4.prototype.p_Keys=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>";
	var t_=c_MapKeys2.m_new.call(new c_MapKeys2,this);
	pop_err();
	return t_;
}
c_Map4.prototype.p_FirstNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
	if(!((this.m_root)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>";
	while((dbg_object(t_node).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>";
		t_node=dbg_object(t_node).m_left;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>";
	pop_err();
	return t_node;
}
c_Map4.prototype.p_Compare=function(t_lhs,t_rhs){
}
c_Map4.prototype.p_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>";
				pop_err();
				return t_node;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>";
	pop_err();
	return t_node;
}
c_Map4.prototype.p_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.p_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).m_value;
	}
	pop_err();
	return null;
}
function c_StringMap4(){
	c_Map4.call(this);
}
c_StringMap4.prototype=extend_class(c_Map4);
c_StringMap4.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	c_Map4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
c_StringMap4.prototype.p_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function c_SoundBank(){
	c_StringMap4.call(this);
}
c_SoundBank.prototype=extend_class(c_StringMap4);
c_SoundBank.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1594>";
	c_StringMap4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1594>";
	pop_err();
	return this;
}
c_SoundBank.m_path="";
function c_InputCache(){
	Object.call(this);
	this.m_keyHitEnumerator=null;
	this.m_keyDownEnumerator=null;
	this.m_keyReleasedEnumerator=null;
	this.m_keyHitWrapper=null;
	this.m_keyDownWrapper=null;
	this.m_keyReleasedWrapper=null;
	this.m_touchData=new_object_array(32);
	this.m_monitorTouch=false;
	this.m_monitorMouse=false;
	this.m_touchDownCount=0;
	this.m_touchHitCount=0;
	this.m_touchReleasedCount=0;
	this.m_maxTouchDown=-1;
	this.m_maxTouchHit=-1;
	this.m_maxTouchReleased=-1;
	this.m_minTouchDown=-1;
	this.m_minTouchHit=-1;
	this.m_minTouchReleased=-1;
	this.m_touchHit=new_number_array(32);
	this.m_touchHitTime=new_number_array(32);
	this.m_touchDown=new_number_array(32);
	this.m_touchDownTime=new_number_array(32);
	this.m_touchReleasedTime=new_number_array(32);
	this.m_touchReleased=new_number_array(32);
	this.m_touchX=new_number_array(32);
	this.m_touchY=new_number_array(32);
	this.m_currentTouchDown=new_number_array(32);
	this.m_currentTouchHit=new_number_array(32);
	this.m_currentTouchReleased=new_number_array(32);
	this.m_mouseDownCount=0;
	this.m_mouseHitCount=0;
	this.m_mouseReleasedCount=0;
	this.m_mouseX=0;
	this.m_mouseY=0;
	this.m_mouseHit=new_number_array(3);
	this.m_mouseHitTime=new_number_array(3);
	this.m_mouseDown=new_number_array(3);
	this.m_mouseDownTime=new_number_array(3);
	this.m_mouseReleasedTime=new_number_array(3);
	this.m_mouseReleased=new_number_array(3);
	this.m_currentMouseDown=new_number_array(3);
	this.m_currentMouseHit=new_number_array(3);
	this.m_currentMouseReleased=new_number_array(3);
	this.m_keyDownCount=0;
	this.m_keyHitCount=0;
	this.m_keyReleasedCount=0;
	this.m_monitorKeyCount=0;
	this.m_monitorKey=new_bool_array(512);
	this.m_keyHit=new_number_array(512);
	this.m_keyHitTime=new_number_array(512);
	this.m_keyDown=new_number_array(512);
	this.m_keyDownTime=new_number_array(512);
	this.m_keyReleasedTime=new_number_array(512);
	this.m_keyReleased=new_number_array(512);
	this.m_currentKeysDown=new_number_array(512);
	this.m_currentKeysHit=new_number_array(512);
	this.m_currentKeysReleased=new_number_array(512);
	this.m_flingThreshold=250.0;
	this.m_longPressTime=1000;
}
c_InputCache.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<183>";
	this.m_keyHitEnumerator=c_KeyEventEnumerator.m_new.call(new c_KeyEventEnumerator,this,3);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<184>";
	this.m_keyDownEnumerator=c_KeyEventEnumerator.m_new.call(new c_KeyEventEnumerator,this,1);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<185>";
	this.m_keyReleasedEnumerator=c_KeyEventEnumerator.m_new.call(new c_KeyEventEnumerator,this,2);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<186>";
	this.m_keyHitWrapper=c_EnumWrapper.m_new.call(new c_EnumWrapper,this.m_keyHitEnumerator);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<187>";
	this.m_keyDownWrapper=c_EnumWrapper.m_new.call(new c_EnumWrapper,this.m_keyDownEnumerator);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<188>";
	this.m_keyReleasedWrapper=c_EnumWrapper.m_new.call(new c_EnumWrapper,this.m_keyReleasedEnumerator);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<189>";
	for(var t_i=0;t_i<this.m_touchData.length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<190>";
		dbg_array(this.m_touchData,t_i)[dbg_index]=c_TouchData.m_new.call(new c_TouchData)
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<196>";
	this.m_monitorTouch=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<197>";
	this.m_monitorMouse=true;
	pop_err();
	return this;
}
c_InputCache.prototype.p_ReadInput=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<290>";
	var t_newval=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<291>";
	var t_now=bb_app_Millisecs();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<294>";
	if(this.m_monitorTouch){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<295>";
		this.m_touchDownCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<296>";
		this.m_touchHitCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<297>";
		this.m_touchReleasedCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<298>";
		this.m_maxTouchDown=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<299>";
		this.m_maxTouchHit=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<300>";
		this.m_maxTouchReleased=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<301>";
		this.m_minTouchDown=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<302>";
		this.m_minTouchHit=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<303>";
		this.m_minTouchReleased=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<304>";
		for(var t_i=0;t_i<32;t_i=t_i+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<306>";
			t_newval=bb_input_TouchHit(t_i);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<307>";
			if(!((dbg_array(this.m_touchHit,t_i)[dbg_index])!=0) && ((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<308>";
				dbg_array(this.m_touchHitTime,t_i)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<310>";
			dbg_array(this.m_touchHit,t_i)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<312>";
			t_newval=bb_input_TouchDown(t_i);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<313>";
			if(((t_newval)!=0) && !((dbg_array(this.m_touchDown,t_i)[dbg_index])!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<314>";
				dbg_array(this.m_touchDownTime,t_i)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<317>";
			if(((dbg_array(this.m_touchDown,t_i)[dbg_index])!=0) && !((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<318>";
				dbg_array(this.m_touchReleasedTime,t_i)[dbg_index]=t_now
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<319>";
				dbg_array(this.m_touchReleased,t_i)[dbg_index]=1
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<321>";
				dbg_array(this.m_touchReleased,t_i)[dbg_index]=0
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<323>";
			dbg_array(this.m_touchDown,t_i)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<325>";
			dbg_array(this.m_touchX,t_i)[dbg_index]=bb_input_TouchX(t_i)
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<326>";
			dbg_array(this.m_touchY,t_i)[dbg_index]=bb_input_TouchY(t_i)
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<328>";
			if((dbg_array(this.m_touchDown,t_i)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<329>";
				dbg_array(this.m_currentTouchDown,this.m_touchDownCount)[dbg_index]=t_i
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<330>";
				this.m_touchDownCount+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<331>";
				if(this.m_minTouchDown<0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<331>";
					this.m_minTouchDown=t_i;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<332>";
				this.m_maxTouchDown=t_i;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<334>";
			if((dbg_array(this.m_touchHit,t_i)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<335>";
				dbg_array(this.m_currentTouchHit,this.m_touchHitCount)[dbg_index]=t_i
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<336>";
				this.m_touchHitCount+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<337>";
				if(this.m_minTouchHit<0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<337>";
					this.m_minTouchHit=t_i;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<338>";
				this.m_maxTouchHit=t_i;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<340>";
			if((dbg_array(this.m_touchReleased,t_i)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<341>";
				dbg_array(this.m_currentTouchReleased,this.m_touchReleasedCount)[dbg_index]=t_i
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<342>";
				this.m_touchReleasedCount+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<343>";
				if(this.m_minTouchReleased<0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<343>";
					this.m_minTouchReleased=t_i;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<344>";
				this.m_maxTouchReleased=t_i;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<350>";
	if(this.m_monitorMouse){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<351>";
		this.m_mouseDownCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<352>";
		this.m_mouseHitCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<353>";
		this.m_mouseReleasedCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<354>";
		this.m_mouseX=dbg_object(bb_framework_diddyGame).m_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<355>";
		this.m_mouseY=dbg_object(bb_framework_diddyGame).m_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<356>";
		for(var t_i2=0;t_i2<3;t_i2=t_i2+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<358>";
			t_newval=bb_input_MouseHit(t_i2);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<359>";
			if(!((dbg_array(this.m_mouseHit,t_i2)[dbg_index])!=0) && ((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<360>";
				dbg_array(this.m_mouseHitTime,t_i2)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<362>";
			dbg_array(this.m_mouseHit,t_i2)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<364>";
			t_newval=bb_input_MouseDown(t_i2);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<365>";
			if(((t_newval)!=0) && !((dbg_array(this.m_mouseDown,t_i2)[dbg_index])!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<366>";
				dbg_array(this.m_mouseDownTime,t_i2)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<369>";
			if(((dbg_array(this.m_mouseDown,t_i2)[dbg_index])!=0) && !((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<370>";
				dbg_array(this.m_mouseReleasedTime,t_i2)[dbg_index]=t_now
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<371>";
				dbg_array(this.m_mouseReleased,t_i2)[dbg_index]=1
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<373>";
				dbg_array(this.m_mouseReleased,t_i2)[dbg_index]=0
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<375>";
			dbg_array(this.m_mouseDown,t_i2)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<377>";
			if((dbg_array(this.m_mouseDown,t_i2)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<378>";
				dbg_array(this.m_currentMouseDown,this.m_mouseDownCount)[dbg_index]=t_i2
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<379>";
				this.m_mouseDownCount+=1;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<381>";
			if((dbg_array(this.m_mouseHit,t_i2)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<382>";
				dbg_array(this.m_currentMouseHit,this.m_mouseHitCount)[dbg_index]=t_i2
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<383>";
				this.m_mouseHitCount+=1;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<385>";
			if((dbg_array(this.m_mouseReleased,t_i2)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<386>";
				dbg_array(this.m_currentMouseReleased,this.m_mouseReleasedCount)[dbg_index]=t_i2
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<387>";
				this.m_mouseReleasedCount+=1;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<393>";
	this.m_keyDownCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<394>";
	this.m_keyHitCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<395>";
	this.m_keyReleasedCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<396>";
	if(this.m_monitorKeyCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<397>";
		for(var t_i3=8;t_i3<=222;t_i3=t_i3+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<398>";
			if(dbg_array(this.m_monitorKey,t_i3)[dbg_index]){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<400>";
				t_newval=bb_input_KeyHit(t_i3);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<401>";
				if(!((dbg_array(this.m_keyHit,t_i3)[dbg_index])!=0) && ((t_newval)!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<402>";
					dbg_array(this.m_keyHitTime,t_i3)[dbg_index]=t_now
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<404>";
				dbg_array(this.m_keyHit,t_i3)[dbg_index]=t_newval
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<406>";
				t_newval=bb_input_KeyDown(t_i3);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<407>";
				if(((t_newval)!=0) && !((dbg_array(this.m_keyDown,t_i3)[dbg_index])!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<408>";
					dbg_array(this.m_keyDownTime,t_i3)[dbg_index]=t_now
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<411>";
				if(((dbg_array(this.m_keyDown,t_i3)[dbg_index])!=0) && !((t_newval)!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<412>";
					dbg_array(this.m_keyReleasedTime,t_i3)[dbg_index]=t_now
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<413>";
					dbg_array(this.m_keyReleased,t_i3)[dbg_index]=1
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<415>";
					dbg_array(this.m_keyReleased,t_i3)[dbg_index]=0
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<417>";
				dbg_array(this.m_keyDown,t_i3)[dbg_index]=t_newval
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<419>";
				if((dbg_array(this.m_keyDown,t_i3)[dbg_index])!=0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<420>";
					dbg_array(this.m_currentKeysDown,this.m_keyDownCount)[dbg_index]=t_i3
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<421>";
					this.m_keyDownCount+=1;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<423>";
				if((dbg_array(this.m_keyHit,t_i3)[dbg_index])!=0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<424>";
					dbg_array(this.m_currentKeysHit,this.m_keyHitCount)[dbg_index]=t_i3
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<425>";
					this.m_keyHitCount+=1;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<427>";
				if((dbg_array(this.m_keyReleased,t_i3)[dbg_index])!=0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<428>";
					dbg_array(this.m_currentKeysReleased,this.m_keyReleasedCount)[dbg_index]=t_i3
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<429>";
					this.m_keyReleasedCount+=1;
				}
			}
		}
	}
	pop_err();
}
c_InputCache.prototype.p_HandleEvents=function(t_screen){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<438>";
	for(var t_i=0;t_i<this.m_touchHitCount;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<439>";
		var t_pointer=dbg_array(this.m_currentTouchHit,t_i)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<440>";
		var t_x=((dbg_array(this.m_touchX,t_pointer)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<441>";
		var t_y=((dbg_array(this.m_touchY,t_pointer)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<442>";
		dbg_array(this.m_touchData,t_pointer)[dbg_index].p_Reset(t_x,t_y);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<443>";
		t_screen.p_OnTouchHit(t_x,t_y,t_pointer);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<447>";
	for(var t_i2=0;t_i2<this.m_touchReleasedCount;t_i2=t_i2+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<448>";
		var t_pointer2=dbg_array(this.m_currentTouchReleased,t_i2)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<449>";
		var t_x2=((dbg_array(this.m_touchX,t_pointer2)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<450>";
		var t_y2=((dbg_array(this.m_touchY,t_pointer2)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<451>";
		dbg_array(this.m_touchData,t_pointer2)[dbg_index].p_Update3(t_x2,t_y2);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<452>";
		if(!dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_movedTooFar && !dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_firedLongPress){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<453>";
			t_screen.p_OnTouchClick(t_x2,t_y2,t_pointer2);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<458>";
			if(dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_touchVelocityX*dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_touchVelocityX+dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_touchVelocityY*dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_touchVelocityY>=this.m_flingThreshold*this.m_flingThreshold){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<460>";
				t_screen.p_OnTouchFling(t_x2,t_y2,dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_touchVelocityX,dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_touchVelocityY,dbg_object(dbg_array(this.m_touchData,t_pointer2)[dbg_index]).m_touchVelocitySpeed,t_pointer2);
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<463>";
		t_screen.p_OnTouchReleased(t_x2,t_y2,t_pointer2);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<466>";
	for(var t_i3=0;t_i3<this.m_touchDownCount;t_i3=t_i3+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<467>";
		var t_pointer3=dbg_array(this.m_currentTouchDown,t_i3)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<468>";
		var t_x3=((dbg_array(this.m_touchX,t_pointer3)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<469>";
		var t_y3=((dbg_array(this.m_touchY,t_pointer3)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<470>";
		dbg_array(this.m_touchData,t_pointer3)[dbg_index].p_Update3(t_x3,t_y3);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<471>";
		t_screen.p_OnTouchDragged(t_x3,t_y3,dbg_object(dbg_array(this.m_touchData,t_pointer3)[dbg_index]).m_distanceMovedX,dbg_object(dbg_array(this.m_touchData,t_pointer3)[dbg_index]).m_distanceMovedY,t_pointer3);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<473>";
		if(!dbg_object(dbg_array(this.m_touchData,t_pointer3)[dbg_index]).m_testedLongPress && dbg_object(bb_framework_dt).m_currentticks-(dbg_object(dbg_array(this.m_touchData,t_pointer3)[dbg_index]).m_firstTouchTime)>=(this.m_longPressTime)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<474>";
			dbg_object(dbg_array(this.m_touchData,t_pointer3)[dbg_index]).m_testedLongPress=true;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<475>";
			if(!dbg_object(dbg_array(this.m_touchData,t_pointer3)[dbg_index]).m_movedTooFar){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<477>";
				t_screen.p_OnTouchLongPress(t_x3,t_y3,t_pointer3);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<478>";
				dbg_object(dbg_array(this.m_touchData,t_pointer3)[dbg_index]).m_firedLongPress=true;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<484>";
	if(this.m_keyHitCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<484>";
		t_screen.p_OnAnyKeyHit();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<485>";
	for(var t_i4=0;t_i4<this.m_keyHitCount;t_i4=t_i4+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<486>";
		var t_key=dbg_array(this.m_currentKeysHit,t_i4)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<487>";
		t_screen.p_OnKeyHit(t_key);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<491>";
	if(this.m_keyDownCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<491>";
		t_screen.p_OnAnyKeyDown();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<492>";
	for(var t_i5=0;t_i5<this.m_keyDownCount;t_i5=t_i5+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<493>";
		var t_key2=dbg_array(this.m_currentKeysDown,t_i5)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<494>";
		t_screen.p_OnKeyDown(t_key2);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<498>";
	if(this.m_keyReleasedCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<498>";
		t_screen.p_OnAnyKeyReleased();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<499>";
	for(var t_i6=0;t_i6<this.m_keyReleasedCount;t_i6=t_i6+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<500>";
		var t_key3=dbg_array(this.m_currentKeysReleased,t_i6)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<501>";
		t_screen.p_OnKeyReleased(t_key3);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<504>";
	for(var t_i7=0;t_i7<this.m_mouseHitCount;t_i7=t_i7+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<505>";
		var t_button=dbg_array(this.m_currentMouseHit,t_i7)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<506>";
		var t_x4=this.m_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<507>";
		var t_y4=this.m_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<508>";
		t_screen.p_OnMouseHit(t_x4,t_y4,t_button);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<511>";
	for(var t_i8=0;t_i8<this.m_mouseDownCount;t_i8=t_i8+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<512>";
		var t_button2=dbg_array(this.m_currentMouseDown,t_i8)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<513>";
		var t_x5=this.m_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<514>";
		var t_y5=this.m_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<515>";
		t_screen.p_OnMouseDown(t_x5,t_y5,t_button2);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<518>";
	for(var t_i9=0;t_i9<this.m_mouseReleasedCount;t_i9=t_i9+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<519>";
		var t_button3=dbg_array(this.m_currentMouseReleased,t_i9)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<520>";
		var t_x6=this.m_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<521>";
		var t_y6=this.m_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<522>";
		t_screen.p_OnMouseReleased(t_x6,t_y6,t_button3);
	}
	pop_err();
}
function c_InputEventEnumerator(){
	Object.call(this);
	this.m_ic=null;
	this.m_eventType=0;
}
c_InputEventEnumerator.m_new=function(t_ic,t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<587>";
	dbg_object(this).m_ic=t_ic;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<588>";
	dbg_object(this).m_eventType=t_eventType;
	pop_err();
	return this;
}
c_InputEventEnumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<579>";
	pop_err();
	return this;
}
function c_KeyEventEnumerator(){
	c_InputEventEnumerator.call(this);
	this.m_event=null;
}
c_KeyEventEnumerator.prototype=extend_class(c_InputEventEnumerator);
c_KeyEventEnumerator.m_new=function(t_ic,t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<603>";
	c_InputEventEnumerator.m_new.call(this,t_ic,t_eventType);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<604>";
	dbg_object(this).m_event=c_KeyEvent.m_new2.call(new c_KeyEvent);
	pop_err();
	return this;
}
c_KeyEventEnumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<597>";
	c_InputEventEnumerator.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<597>";
	pop_err();
	return this;
}
function c_InputEvent(){
	Object.call(this);
	this.m_eventType=0;
}
c_InputEvent.m_new=function(t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<554>";
	dbg_object(this).m_eventType=t_eventType;
	pop_err();
	return this;
}
c_InputEvent.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<528>";
	pop_err();
	return this;
}
function c_KeyEvent(){
	c_InputEvent.call(this);
}
c_KeyEvent.prototype=extend_class(c_InputEvent);
c_KeyEvent.m_new=function(t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<573>";
	c_InputEvent.m_new.call(this,t_eventType);
	pop_err();
	return this;
}
c_KeyEvent.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<559>";
	c_InputEvent.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<559>";
	pop_err();
	return this;
}
function c_EnumWrapper(){
	Object.call(this);
	this.m_wrappedEnum=null;
}
c_EnumWrapper.m_new=function(t_wrappedEnum){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<644>";
	dbg_object(this).m_wrappedEnum=t_wrappedEnum;
	pop_err();
	return this;
}
c_EnumWrapper.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<638>";
	pop_err();
	return this;
}
function c_TouchData(){
	Object.call(this);
	this.m_firstTouchX=0;
	this.m_firstTouchY=0;
	this.m_lastTouchX=0;
	this.m_lastTouchY=0;
	this.m_firstTouchTime=0;
	this.m_testedLongPress=false;
	this.m_firedLongPress=false;
	this.m_flingSamplesX=new_number_array(10);
	this.m_flingSamplesY=new_number_array(10);
	this.m_flingSamplesTime=new_number_array(10);
	this.m_flingSampleCount=0;
	this.m_flingSampleNext=0;
	this.m_movedTooFar=false;
	this.m_touchVelocityX=.0;
	this.m_touchVelocityY=.0;
	this.m_touchVelocitySpeed=.0;
	this.m_distanceMovedX=0;
	this.m_distanceMovedY=0;
}
c_TouchData.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<664>";
	pop_err();
	return this;
}
c_TouchData.prototype.p_AddFlingSample=function(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<711>";
	dbg_array(this.m_flingSamplesX,this.m_flingSampleNext)[dbg_index]=t_x
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<712>";
	dbg_array(this.m_flingSamplesY,this.m_flingSampleNext)[dbg_index]=t_y
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<713>";
	dbg_array(this.m_flingSamplesTime,this.m_flingSampleNext)[dbg_index]=((dbg_object(bb_framework_dt).m_currentticks)|0)
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<714>";
	if(this.m_flingSampleCount<10){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<714>";
		this.m_flingSampleCount+=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<715>";
	this.m_flingSampleNext+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<716>";
	if(this.m_flingSampleNext>=10){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<716>";
		this.m_flingSampleNext=0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<719>";
	var t_first=this.m_flingSampleNext-this.m_flingSampleCount;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<720>";
	var t_last=this.m_flingSampleNext-1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<721>";
	while(t_first<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<722>";
		t_first+=10;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<724>";
	while(t_last<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<725>";
		t_last+=10;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<729>";
	if(this.m_flingSampleCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<731>";
		var t_secs=(dbg_array(this.m_flingSamplesTime,t_last)[dbg_index]-dbg_array(this.m_flingSamplesTime,t_first)[dbg_index])/1000.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<732>";
		this.m_touchVelocityX=(dbg_array(this.m_flingSamplesX,t_last)[dbg_index]-dbg_array(this.m_flingSamplesX,t_first)[dbg_index])/t_secs;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<733>";
		this.m_touchVelocityY=(dbg_array(this.m_flingSamplesY,t_last)[dbg_index]-dbg_array(this.m_flingSamplesY,t_first)[dbg_index])/t_secs;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<734>";
		this.m_touchVelocitySpeed=Math.sqrt(this.m_touchVelocityX*this.m_touchVelocityX+this.m_touchVelocityY*this.m_touchVelocityY);
	}
	pop_err();
}
c_TouchData.prototype.p_Reset=function(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<689>";
	this.m_firstTouchX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<690>";
	this.m_firstTouchY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<691>";
	this.m_lastTouchX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<692>";
	this.m_lastTouchY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<693>";
	this.m_firstTouchTime=((dbg_object(bb_framework_dt).m_currentticks)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<694>";
	this.m_testedLongPress=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<695>";
	this.m_firedLongPress=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<696>";
	for(var t_i=0;t_i<10;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<697>";
		dbg_array(this.m_flingSamplesX,t_i)[dbg_index]=0
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<698>";
		dbg_array(this.m_flingSamplesY,t_i)[dbg_index]=0
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<699>";
		dbg_array(this.m_flingSamplesTime,t_i)[dbg_index]=0
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<701>";
	this.m_flingSampleCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<702>";
	this.m_flingSampleNext=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<703>";
	this.m_movedTooFar=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<704>";
	this.m_touchVelocityX=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<705>";
	this.m_touchVelocityY=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<706>";
	this.m_touchVelocitySpeed=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<707>";
	this.p_AddFlingSample(t_x,t_y);
	pop_err();
}
c_TouchData.prototype.p_Update3=function(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<740>";
	this.m_distanceMovedX=t_x-this.m_lastTouchX;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<741>";
	this.m_distanceMovedY=t_y-this.m_lastTouchY;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<742>";
	this.m_lastTouchX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<743>";
	this.m_lastTouchY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<745>";
	this.p_AddFlingSample(t_x,t_y);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<747>";
	if(!this.m_movedTooFar){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<749>";
		var t_dx=t_x-this.m_firstTouchX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<750>";
		var t_dy=t_y-this.m_firstTouchY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<751>";
		if((t_dx*t_dx+t_dy*t_dy)>400.0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<752>";
			this.m_movedTooFar=true;
		}
	}
	pop_err();
}
function c_DiddyMouse(){
	Object.call(this);
	this.m_lastX=0;
	this.m_lastY=0;
}
c_DiddyMouse.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2139>";
	diddy.mouseZInit();
	pop_err();
	return this;
}
c_DiddyMouse.prototype.p_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2154>";
	this.m_lastX=dbg_object(bb_framework_diddyGame).m_mouseX;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2155>";
	this.m_lastY=dbg_object(bb_framework_diddyGame).m_mouseY;
	pop_err();
}
function bbMain(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyShooter.monkey<14>";
	c_Game.m_new.call(new c_Game);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyShooter.monkey<15>";
	pop_err();
	return 0;
}
function c_ConstInfo(){
	Object.call(this);
}
function c_Stack(){
	Object.call(this);
	this.m_data=[];
	this.m_length=0;
}
c_Stack.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_Stack.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).m_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).m_length=t_data.length;
	pop_err();
	return this;
}
c_Stack.prototype.p_Push=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>";
	if(this.m_length==this.m_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>";
		this.m_data=resize_object_array(this.m_data,this.m_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>";
	dbg_array(this.m_data,this.m_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>";
	this.m_length+=1;
	pop_err();
}
c_Stack.prototype.p_Push2=function(t_values,t_offset,t_count){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>";
	for(var t_i=0;t_i<t_count;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>";
		this.p_Push(dbg_array(t_values,t_offset+t_i)[dbg_index]);
	}
	pop_err();
}
c_Stack.prototype.p_Push3=function(t_values,t_offset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>";
	this.p_Push2(t_values,t_offset,t_values.length-t_offset);
	pop_err();
}
c_Stack.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.m_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.m_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.m_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function c_FieldInfo(){
	Object.call(this);
	this.m__name="";
	this.m__attrs=0;
	this.m__type=null;
}
c_FieldInfo.m_new=function(t_name,t_attrs,t_type){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<111>";
	this.m__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<112>";
	this.m__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<113>";
	this.m__type=t_type;
	pop_err();
	return this;
}
c_FieldInfo.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<108>";
	pop_err();
	return this;
}
function c_Stack2(){
	Object.call(this);
	this.m_data=[];
	this.m_length=0;
}
c_Stack2.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_Stack2.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).m_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).m_length=t_data.length;
	pop_err();
	return this;
}
c_Stack2.prototype.p_Push4=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>";
	if(this.m_length==this.m_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>";
		this.m_data=resize_object_array(this.m_data,this.m_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>";
	dbg_array(this.m_data,this.m_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>";
	this.m_length+=1;
	pop_err();
}
c_Stack2.prototype.p_Push5=function(t_values,t_offset,t_count){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>";
	for(var t_i=0;t_i<t_count;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>";
		this.p_Push4(dbg_array(t_values,t_offset+t_i)[dbg_index]);
	}
	pop_err();
}
c_Stack2.prototype.p_Push6=function(t_values,t_offset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>";
	this.p_Push5(t_values,t_offset,t_values.length-t_offset);
	pop_err();
}
c_Stack2.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.m_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.m_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.m_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function c_GlobalInfo(){
	Object.call(this);
}
function c_Stack3(){
	Object.call(this);
	this.m_data=[];
	this.m_length=0;
}
c_Stack3.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_Stack3.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).m_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).m_length=t_data.length;
	pop_err();
	return this;
}
c_Stack3.prototype.p_Push7=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>";
	if(this.m_length==this.m_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>";
		this.m_data=resize_object_array(this.m_data,this.m_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>";
	dbg_array(this.m_data,this.m_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>";
	this.m_length+=1;
	pop_err();
}
c_Stack3.prototype.p_Push8=function(t_values,t_offset,t_count){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>";
	for(var t_i=0;t_i<t_count;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>";
		this.p_Push7(dbg_array(t_values,t_offset+t_i)[dbg_index]);
	}
	pop_err();
}
c_Stack3.prototype.p_Push9=function(t_values,t_offset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>";
	this.p_Push8(t_values,t_offset,t_values.length-t_offset);
	pop_err();
}
c_Stack3.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.m_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.m_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.m_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function c_MethodInfo(){
	Object.call(this);
	this.m__name="";
	this.m__attrs=0;
	this.m__retType=null;
	this.m__argTypes=[];
}
c_MethodInfo.m_new=function(t_name,t_attrs,t_retType,t_argTypes){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<143>";
	this.m__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<144>";
	this.m__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<145>";
	this.m__retType=t_retType;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<146>";
	this.m__argTypes=t_argTypes;
	pop_err();
	return this;
}
c_MethodInfo.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<140>";
	pop_err();
	return this;
}
function c_Stack4(){
	Object.call(this);
	this.m_data=[];
	this.m_length=0;
}
c_Stack4.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_Stack4.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).m_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).m_length=t_data.length;
	pop_err();
	return this;
}
c_Stack4.prototype.p_Push10=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>";
	if(this.m_length==this.m_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>";
		this.m_data=resize_object_array(this.m_data,this.m_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>";
	dbg_array(this.m_data,this.m_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>";
	this.m_length+=1;
	pop_err();
}
c_Stack4.prototype.p_Push11=function(t_values,t_offset,t_count){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>";
	for(var t_i=0;t_i<t_count;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>";
		this.p_Push10(dbg_array(t_values,t_offset+t_i)[dbg_index]);
	}
	pop_err();
}
c_Stack4.prototype.p_Push12=function(t_values,t_offset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>";
	this.p_Push11(t_values,t_offset,t_values.length-t_offset);
	pop_err();
}
c_Stack4.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.m_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.m_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.m_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function c_Stack5(){
	Object.call(this);
	this.m_data=[];
	this.m_length=0;
}
c_Stack5.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_Stack5.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).m_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).m_length=t_data.length;
	pop_err();
	return this;
}
c_Stack5.prototype.p_Push13=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>";
	if(this.m_length==this.m_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>";
		this.m_data=resize_object_array(this.m_data,this.m_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>";
	dbg_array(this.m_data,this.m_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>";
	this.m_length+=1;
	pop_err();
}
c_Stack5.prototype.p_Push14=function(t_values,t_offset,t_count){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>";
	for(var t_i=0;t_i<t_count;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>";
		this.p_Push13(dbg_array(t_values,t_offset+t_i)[dbg_index]);
	}
	pop_err();
}
c_Stack5.prototype.p_Push15=function(t_values,t_offset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>";
	this.p_Push14(t_values,t_offset,t_values.length-t_offset);
	pop_err();
}
c_Stack5.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.m_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.m_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.m_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function c_R19(){
	c_FieldInfo.call(this);
}
c_R19.prototype=extend_class(c_FieldInfo);
c_R19.m_new=function(){
	c_FieldInfo.m_new.call(this,"message",2,bb_reflection__stringClass);
	return this;
}
function c_R20(){
	c_FieldInfo.call(this);
}
c_R20.prototype=extend_class(c_FieldInfo);
c_R20.m_new=function(){
	c_FieldInfo.m_new.call(this,"cause",2,dbg_array(bb_reflection__classes,1)[dbg_index]);
	return this;
}
function c_R21(){
	c_FieldInfo.call(this);
}
c_R21.prototype=extend_class(c_FieldInfo);
c_R21.m_new=function(){
	c_FieldInfo.m_new.call(this,"type",2,bb_reflection__stringClass);
	return this;
}
function c_R22(){
	c_FieldInfo.call(this);
}
c_R22.prototype=extend_class(c_FieldInfo);
c_R22.m_new=function(){
	c_FieldInfo.m_new.call(this,"fullType",2,bb_reflection__stringClass);
	return this;
}
function c_R23(){
	c_MethodInfo.call(this);
}
c_R23.prototype=extend_class(c_MethodInfo);
c_R23.m_new=function(){
	c_MethodInfo.m_new.call(this,"Message",8,bb_reflection__stringClass,[]);
	return this;
}
function c_R24(){
	c_MethodInfo.call(this);
}
c_R24.prototype=extend_class(c_MethodInfo);
c_R24.m_new=function(){
	c_MethodInfo.m_new.call(this,"Message",8,null,[bb_reflection__stringClass]);
	return this;
}
function c_R25(){
	c_MethodInfo.call(this);
}
c_R25.prototype=extend_class(c_MethodInfo);
c_R25.m_new=function(){
	c_MethodInfo.m_new.call(this,"Cause",8,dbg_array(bb_reflection__classes,1)[dbg_index],[]);
	return this;
}
function c_R26(){
	c_MethodInfo.call(this);
}
c_R26.prototype=extend_class(c_MethodInfo);
c_R26.m_new=function(){
	c_MethodInfo.m_new.call(this,"Cause",8,null,[dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function c_R27(){
	c_MethodInfo.call(this);
}
c_R27.prototype=extend_class(c_MethodInfo);
c_R27.m_new=function(){
	c_MethodInfo.m_new.call(this,"Type",8,bb_reflection__stringClass,[]);
	return this;
}
function c_R28(){
	c_MethodInfo.call(this);
}
c_R28.prototype=extend_class(c_MethodInfo);
c_R28.m_new=function(){
	c_MethodInfo.m_new.call(this,"FullType",8,bb_reflection__stringClass,[]);
	return this;
}
function c_R30(){
	c_MethodInfo.call(this);
}
c_R30.prototype=extend_class(c_MethodInfo);
c_R30.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToString",0,bb_reflection__stringClass,[bb_reflection__boolClass]);
	return this;
}
function c_R29(){
	c_FunctionInfo.call(this);
}
c_R29.prototype=extend_class(c_FunctionInfo);
c_R29.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,2)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function c_R32(){
	c_FunctionInfo.call(this);
}
c_R32.prototype=extend_class(c_FunctionInfo);
c_R32.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,3)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function c_R34(){
	c_FunctionInfo.call(this);
}
c_R34.prototype=extend_class(c_FunctionInfo);
c_R34.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,4)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function c_R36(){
	c_FunctionInfo.call(this);
}
c_R36.prototype=extend_class(c_FunctionInfo);
c_R36.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,5)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function c_R38(){
	c_FunctionInfo.call(this);
}
c_R38.prototype=extend_class(c_FunctionInfo);
c_R38.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,6)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function c_R40(){
	c_FunctionInfo.call(this);
}
c_R40.prototype=extend_class(c_FunctionInfo);
c_R40.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,7)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function c_R42(){
	c_FieldInfo.call(this);
}
c_R42.prototype=extend_class(c_FieldInfo);
c_R42.m_new=function(){
	c_FieldInfo.m_new.call(this,"value",0,bb_reflection__boolClass);
	return this;
}
function c_R44(){
	c_MethodInfo.call(this);
}
c_R44.prototype=extend_class(c_MethodInfo);
c_R44.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToBool",0,bb_reflection__boolClass,[]);
	return this;
}
function c_R45(){
	c_MethodInfo.call(this);
}
c_R45.prototype=extend_class(c_MethodInfo);
c_R45.m_new=function(){
	c_MethodInfo.m_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,8)[dbg_index]]);
	return this;
}
function c_R43(){
	c_FunctionInfo.call(this);
}
c_R43.prototype=extend_class(c_FunctionInfo);
c_R43.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,8)[dbg_index],[bb_reflection__boolClass]);
	return this;
}
function c_R46(){
	c_FunctionInfo.call(this);
}
c_R46.prototype=extend_class(c_FunctionInfo);
c_R46.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,8)[dbg_index],[]);
	return this;
}
function c_R48(){
	c_FieldInfo.call(this);
}
c_R48.prototype=extend_class(c_FieldInfo);
c_R48.m_new=function(){
	c_FieldInfo.m_new.call(this,"value",0,bb_reflection__intClass);
	return this;
}
function c_R51(){
	c_MethodInfo.call(this);
}
c_R51.prototype=extend_class(c_MethodInfo);
c_R51.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToInt",0,bb_reflection__intClass,[]);
	return this;
}
function c_R52(){
	c_MethodInfo.call(this);
}
c_R52.prototype=extend_class(c_MethodInfo);
c_R52.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToFloat",0,bb_reflection__floatClass,[]);
	return this;
}
function c_R53(){
	c_MethodInfo.call(this);
}
c_R53.prototype=extend_class(c_MethodInfo);
c_R53.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToString",0,bb_reflection__stringClass,[]);
	return this;
}
function c_R54(){
	c_MethodInfo.call(this);
}
c_R54.prototype=extend_class(c_MethodInfo);
c_R54.m_new=function(){
	c_MethodInfo.m_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,9)[dbg_index]]);
	return this;
}
function c_R55(){
	c_MethodInfo.call(this);
}
c_R55.prototype=extend_class(c_MethodInfo);
c_R55.m_new=function(){
	c_MethodInfo.m_new.call(this,"Compare",0,bb_reflection__intClass,[dbg_array(bb_reflection__classes,9)[dbg_index]]);
	return this;
}
function c_R49(){
	c_FunctionInfo.call(this);
}
c_R49.prototype=extend_class(c_FunctionInfo);
c_R49.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,9)[dbg_index],[bb_reflection__intClass]);
	return this;
}
function c_R50(){
	c_FunctionInfo.call(this);
}
c_R50.prototype=extend_class(c_FunctionInfo);
c_R50.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,9)[dbg_index],[bb_reflection__floatClass]);
	return this;
}
function c_R56(){
	c_FunctionInfo.call(this);
}
c_R56.prototype=extend_class(c_FunctionInfo);
c_R56.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,9)[dbg_index],[]);
	return this;
}
function c_R58(){
	c_FieldInfo.call(this);
}
c_R58.prototype=extend_class(c_FieldInfo);
c_R58.m_new=function(){
	c_FieldInfo.m_new.call(this,"value",0,bb_reflection__floatClass);
	return this;
}
function c_R61(){
	c_MethodInfo.call(this);
}
c_R61.prototype=extend_class(c_MethodInfo);
c_R61.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToInt",0,bb_reflection__intClass,[]);
	return this;
}
function c_R62(){
	c_MethodInfo.call(this);
}
c_R62.prototype=extend_class(c_MethodInfo);
c_R62.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToFloat",0,bb_reflection__floatClass,[]);
	return this;
}
function c_R63(){
	c_MethodInfo.call(this);
}
c_R63.prototype=extend_class(c_MethodInfo);
c_R63.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToString",0,bb_reflection__stringClass,[]);
	return this;
}
function c_R64(){
	c_MethodInfo.call(this);
}
c_R64.prototype=extend_class(c_MethodInfo);
c_R64.m_new=function(){
	c_MethodInfo.m_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,10)[dbg_index]]);
	return this;
}
function c_R65(){
	c_MethodInfo.call(this);
}
c_R65.prototype=extend_class(c_MethodInfo);
c_R65.m_new=function(){
	c_MethodInfo.m_new.call(this,"Compare",0,bb_reflection__intClass,[dbg_array(bb_reflection__classes,10)[dbg_index]]);
	return this;
}
function c_R59(){
	c_FunctionInfo.call(this);
}
c_R59.prototype=extend_class(c_FunctionInfo);
c_R59.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,10)[dbg_index],[bb_reflection__intClass]);
	return this;
}
function c_R60(){
	c_FunctionInfo.call(this);
}
c_R60.prototype=extend_class(c_FunctionInfo);
c_R60.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,10)[dbg_index],[bb_reflection__floatClass]);
	return this;
}
function c_R66(){
	c_FunctionInfo.call(this);
}
c_R66.prototype=extend_class(c_FunctionInfo);
c_R66.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,10)[dbg_index],[]);
	return this;
}
function c_R68(){
	c_FieldInfo.call(this);
}
c_R68.prototype=extend_class(c_FieldInfo);
c_R68.m_new=function(){
	c_FieldInfo.m_new.call(this,"value",0,bb_reflection__stringClass);
	return this;
}
function c_R72(){
	c_MethodInfo.call(this);
}
c_R72.prototype=extend_class(c_MethodInfo);
c_R72.m_new=function(){
	c_MethodInfo.m_new.call(this,"ToString",0,bb_reflection__stringClass,[]);
	return this;
}
function c_R73(){
	c_MethodInfo.call(this);
}
c_R73.prototype=extend_class(c_MethodInfo);
c_R73.m_new=function(){
	c_MethodInfo.m_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,11)[dbg_index]]);
	return this;
}
function c_R74(){
	c_MethodInfo.call(this);
}
c_R74.prototype=extend_class(c_MethodInfo);
c_R74.m_new=function(){
	c_MethodInfo.m_new.call(this,"Compare",0,bb_reflection__intClass,[dbg_array(bb_reflection__classes,11)[dbg_index]]);
	return this;
}
function c_R69(){
	c_FunctionInfo.call(this);
}
c_R69.prototype=extend_class(c_FunctionInfo);
c_R69.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[bb_reflection__intClass]);
	return this;
}
function c_R70(){
	c_FunctionInfo.call(this);
}
c_R70.prototype=extend_class(c_FunctionInfo);
c_R70.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[bb_reflection__floatClass]);
	return this;
}
function c_R71(){
	c_FunctionInfo.call(this);
}
c_R71.prototype=extend_class(c_FunctionInfo);
c_R71.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[bb_reflection__stringClass]);
	return this;
}
function c_R75(){
	c_FunctionInfo.call(this);
}
c_R75.prototype=extend_class(c_FunctionInfo);
c_R75.m_new=function(){
	c_FunctionInfo.m_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[]);
	return this;
}
function c_UnknownClass(){
	c_ClassInfo.call(this);
}
c_UnknownClass.prototype=extend_class(c_ClassInfo);
c_UnknownClass.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<625>";
	c_ClassInfo.m_new.call(this,"?",0,null,[]);
	pop_err();
	return this;
}
var bb_reflection__unknownClass=null;
var bb_graphics_device=null;
function bb_graphics_SetGraphicsDevice(t_dev){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<59>";
	bb_graphics_device=t_dev;
	pop_err();
	return 0;
}
function c_Image(){
	Object.call(this);
	this.m_surface=null;
	this.m_width=0;
	this.m_height=0;
	this.m_frames=[];
	this.m_flags=0;
	this.m_tx=.0;
	this.m_ty=.0;
	this.m_source=null;
}
c_Image.m_DefaultFlags=0;
c_Image.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<66>";
	pop_err();
	return this;
}
c_Image.prototype.p_SetHandle=function(t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<110>";
	dbg_object(this).m_tx=t_tx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<111>";
	dbg_object(this).m_ty=t_ty;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<112>";
	dbg_object(this).m_flags=dbg_object(this).m_flags&-2;
	pop_err();
	return 0;
}
c_Image.prototype.p_ApplyFlags=function(t_iflags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<188>";
	this.m_flags=t_iflags;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<190>";
	if((this.m_flags&2)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<191>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<191>";
		var t_=this.m_frames;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<191>";
		var t_2=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<191>";
		while(t_2<t_.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<191>";
			var t_f=dbg_array(t_,t_2)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<191>";
			t_2=t_2+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<192>";
			dbg_object(t_f).m_x+=1;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<194>";
		this.m_width-=2;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<197>";
	if((this.m_flags&4)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>";
		var t_3=this.m_frames;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>";
		var t_4=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>";
		while(t_4<t_3.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>";
			var t_f2=dbg_array(t_3,t_4)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>";
			t_4=t_4+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<199>";
			dbg_object(t_f2).m_y+=1;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<201>";
		this.m_height-=2;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<204>";
	if((this.m_flags&1)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<205>";
		this.p_SetHandle((this.m_width)/2.0,(this.m_height)/2.0);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<208>";
	if(this.m_frames.length==1 && dbg_object(dbg_array(this.m_frames,0)[dbg_index]).m_x==0 && dbg_object(dbg_array(this.m_frames,0)[dbg_index]).m_y==0 && this.m_width==this.m_surface.Width() && this.m_height==this.m_surface.Height()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<209>";
		this.m_flags|=65536;
	}
	pop_err();
	return 0;
}
c_Image.prototype.p_Init2=function(t_surf,t_nframes,t_iflags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<146>";
	this.m_surface=t_surf;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<148>";
	this.m_width=((this.m_surface.Width()/t_nframes)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<149>";
	this.m_height=this.m_surface.Height();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<151>";
	this.m_frames=new_object_array(t_nframes);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<152>";
	for(var t_i=0;t_i<t_nframes;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<153>";
		dbg_array(this.m_frames,t_i)[dbg_index]=c_Frame.m_new.call(new c_Frame,t_i*this.m_width,0)
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<156>";
	this.p_ApplyFlags(t_iflags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<157>";
	pop_err();
	return this;
}
c_Image.prototype.p_Init3=function(t_surf,t_x,t_y,t_iwidth,t_iheight,t_nframes,t_iflags,t_src,t_srcx,t_srcy,t_srcw,t_srch){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<161>";
	this.m_surface=t_surf;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<162>";
	this.m_source=t_src;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<164>";
	this.m_width=t_iwidth;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<165>";
	this.m_height=t_iheight;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<167>";
	this.m_frames=new_object_array(t_nframes);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<169>";
	var t_ix=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<169>";
	var t_iy=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<171>";
	for(var t_i=0;t_i<t_nframes;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<172>";
		if(t_ix+this.m_width>t_srcw){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<173>";
			t_ix=0;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<174>";
			t_iy+=this.m_height;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<176>";
		if(t_ix+this.m_width>t_srcw || t_iy+this.m_height>t_srch){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<177>";
			error("Image frame outside surface");
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<179>";
		dbg_array(this.m_frames,t_i)[dbg_index]=c_Frame.m_new.call(new c_Frame,t_ix+t_srcx,t_iy+t_srcy)
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<180>";
		t_ix+=this.m_width;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<183>";
	this.p_ApplyFlags(t_iflags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<184>";
	pop_err();
	return this;
}
c_Image.prototype.p_HandleX=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<97>";
	pop_err();
	return this.m_tx;
}
c_Image.prototype.p_HandleY=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<101>";
	pop_err();
	return this.m_ty;
}
c_Image.prototype.p_Width=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<77>";
	pop_err();
	return this.m_width;
}
c_Image.prototype.p_Height=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<81>";
	pop_err();
	return this.m_height;
}
c_Image.prototype.p_Frames=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<89>";
	var t_=this.m_frames.length;
	pop_err();
	return t_;
}
c_Image.prototype.p_GrabImage=function(t_x,t_y,t_width,t_height,t_nframes,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<105>";
	if(this.m_frames.length!=1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<105>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<106>";
	var t_=(c_Image.m_new.call(new c_Image)).p_Init3(this.m_surface,t_x,t_y,t_width,t_height,t_nframes,t_flags,this,dbg_object(dbg_array(this.m_frames,0)[dbg_index]).m_x,dbg_object(dbg_array(this.m_frames,0)[dbg_index]).m_y,dbg_object(this).m_width,dbg_object(this).m_height);
	pop_err();
	return t_;
}
c_Image.prototype.p_Discard=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<116>";
	if(((this.m_surface)!=null) && !((this.m_source)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<117>";
		this.m_surface.Discard();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<118>";
		this.m_surface=null;
	}
	pop_err();
	return 0;
}
function c_GraphicsContext(){
	Object.call(this);
	this.m_defaultFont=null;
	this.m_font=null;
	this.m_firstChar=0;
	this.m_matrixSp=0;
	this.m_ix=1.0;
	this.m_iy=.0;
	this.m_jx=.0;
	this.m_jy=1.0;
	this.m_tx=.0;
	this.m_ty=.0;
	this.m_tformed=0;
	this.m_matDirty=0;
	this.m_color_r=.0;
	this.m_color_g=.0;
	this.m_color_b=.0;
	this.m_alpha=.0;
	this.m_blend=0;
	this.m_scissor_x=.0;
	this.m_scissor_y=.0;
	this.m_scissor_width=.0;
	this.m_scissor_height=.0;
	this.m_matrixStack=new_number_array(192);
}
c_GraphicsContext.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<25>";
	pop_err();
	return this;
}
c_GraphicsContext.prototype.p_Validate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<36>";
	if((this.m_matDirty)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<37>";
		bb_graphics_renderDevice.SetMatrix(dbg_object(bb_graphics_context).m_ix,dbg_object(bb_graphics_context).m_iy,dbg_object(bb_graphics_context).m_jx,dbg_object(bb_graphics_context).m_jy,dbg_object(bb_graphics_context).m_tx,dbg_object(bb_graphics_context).m_ty);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<38>";
		this.m_matDirty=0;
	}
	pop_err();
	return 0;
}
var bb_graphics_context=null;
function bb_data_FixDataPath(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<3>";
	var t_i=t_path.indexOf(":/",0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<4>";
	if(t_i!=-1 && t_path.indexOf("/",0)==t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<4>";
		pop_err();
		return t_path;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<5>";
	if(string_startswith(t_path,"./") || string_startswith(t_path,"/")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<5>";
		pop_err();
		return t_path;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<6>";
	var t_="monkey://data/"+t_path;
	pop_err();
	return t_;
}
function c_Frame(){
	Object.call(this);
	this.m_x=0;
	this.m_y=0;
}
c_Frame.m_new=function(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<19>";
	dbg_object(this).m_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<20>";
	dbg_object(this).m_y=t_y;
	pop_err();
	return this;
}
c_Frame.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<14>";
	pop_err();
	return this;
}
function bb_graphics_LoadImage(t_path,t_frameCount,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<238>";
	var t_surf=bb_graphics_device.LoadSurface(bb_data_FixDataPath(t_path));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<239>";
	if((t_surf)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<239>";
		var t_=(c_Image.m_new.call(new c_Image)).p_Init2(t_surf,t_frameCount,t_flags);
		pop_err();
		return t_;
	}
	pop_err();
	return null;
}
function bb_graphics_LoadImage2(t_path,t_frameWidth,t_frameHeight,t_frameCount,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<243>";
	var t_surf=bb_graphics_device.LoadSurface(bb_data_FixDataPath(t_path));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<244>";
	if((t_surf)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<244>";
		var t_=(c_Image.m_new.call(new c_Image)).p_Init3(t_surf,0,0,t_frameWidth,t_frameHeight,t_frameCount,t_flags,null,0,0,t_surf.Width(),t_surf.Height());
		pop_err();
		return t_;
	}
	pop_err();
	return null;
}
function bb_graphics_SetFont(t_font,t_firstChar){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<545>";
	if(!((t_font)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<546>";
		if(!((dbg_object(bb_graphics_context).m_defaultFont)!=null)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<547>";
			dbg_object(bb_graphics_context).m_defaultFont=bb_graphics_LoadImage("mojo_font.png",96,2);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<549>";
		t_font=dbg_object(bb_graphics_context).m_defaultFont;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<550>";
		t_firstChar=32;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<552>";
	dbg_object(bb_graphics_context).m_font=t_font;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<553>";
	dbg_object(bb_graphics_context).m_firstChar=t_firstChar;
	pop_err();
	return 0;
}
var bb_audio_device=null;
function bb_audio_SetAudioDevice(t_dev){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<18>";
	bb_audio_device=t_dev;
	pop_err();
	return 0;
}
function c_InputDevice(){
	Object.call(this);
	this.m__joyStates=new_object_array(4);
	this.m__keyDown=new_bool_array(512);
	this.m__keyHitPut=0;
	this.m__keyHitQueue=new_number_array(33);
	this.m__keyHit=new_number_array(512);
	this.m__charGet=0;
	this.m__charPut=0;
	this.m__charQueue=new_number_array(32);
	this.m__mouseX=.0;
	this.m__mouseY=.0;
	this.m__touchX=new_number_array(32);
	this.m__touchY=new_number_array(32);
	this.m__accelX=.0;
	this.m__accelY=.0;
	this.m__accelZ=.0;
}
c_InputDevice.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<22>";
	for(var t_i=0;t_i<4;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<23>";
		dbg_array(this.m__joyStates,t_i)[dbg_index]=c_JoyState.m_new.call(new c_JoyState)
	}
	pop_err();
	return this;
}
c_InputDevice.prototype.p_PutKeyHit=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<233>";
	if(this.m__keyHitPut==this.m__keyHitQueue.length){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<234>";
	dbg_array(this.m__keyHit,t_key)[dbg_index]+=1
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<235>";
	dbg_array(this.m__keyHitQueue,this.m__keyHitPut)[dbg_index]=t_key
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<236>";
	this.m__keyHitPut+=1;
	pop_err();
}
c_InputDevice.prototype.p_BeginUpdate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<185>";
	for(var t_i=0;t_i<4;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<186>";
		var t_state=dbg_array(this.m__joyStates,t_i)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<187>";
		if(!BBGame.Game().PollJoystick(t_i,dbg_object(t_state).m_joyx,dbg_object(t_state).m_joyy,dbg_object(t_state).m_joyz,dbg_object(t_state).m_buttons)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<187>";
			break;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<188>";
		for(var t_j=0;t_j<32;t_j=t_j+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<189>";
			var t_key=256+t_i*32+t_j;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<190>";
			if(dbg_array(dbg_object(t_state).m_buttons,t_j)[dbg_index]){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<191>";
				if(!dbg_array(this.m__keyDown,t_key)[dbg_index]){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<192>";
					dbg_array(this.m__keyDown,t_key)[dbg_index]=true
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<193>";
					this.p_PutKeyHit(t_key);
				}
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<196>";
				dbg_array(this.m__keyDown,t_key)[dbg_index]=false
			}
		}
	}
	pop_err();
}
c_InputDevice.prototype.p_EndUpdate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<203>";
	for(var t_i=0;t_i<this.m__keyHitPut;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<204>";
		dbg_array(this.m__keyHit,dbg_array(this.m__keyHitQueue,t_i)[dbg_index])[dbg_index]=0
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<206>";
	this.m__keyHitPut=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<207>";
	this.m__charGet=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<208>";
	this.m__charPut=0;
	pop_err();
}
c_InputDevice.prototype.p_KeyEvent=function(t_event,t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<107>";
	var t_1=t_event;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<108>";
	if(t_1==1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<109>";
		if(!dbg_array(this.m__keyDown,t_data)[dbg_index]){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<110>";
			dbg_array(this.m__keyDown,t_data)[dbg_index]=true
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<111>";
			this.p_PutKeyHit(t_data);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<112>";
			if(t_data==1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<113>";
				dbg_array(this.m__keyDown,384)[dbg_index]=true
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<114>";
				this.p_PutKeyHit(384);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<115>";
				if(t_data==384){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<116>";
					dbg_array(this.m__keyDown,1)[dbg_index]=true
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<117>";
					this.p_PutKeyHit(1);
				}
			}
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<120>";
		if(t_1==2){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<121>";
			if(dbg_array(this.m__keyDown,t_data)[dbg_index]){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<122>";
				dbg_array(this.m__keyDown,t_data)[dbg_index]=false
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<123>";
				if(t_data==1){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<124>";
					dbg_array(this.m__keyDown,384)[dbg_index]=false
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<125>";
					if(t_data==384){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<126>";
						dbg_array(this.m__keyDown,1)[dbg_index]=false
					}
				}
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<129>";
			if(t_1==3){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<130>";
				if(this.m__charPut<this.m__charQueue.length){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<131>";
					dbg_array(this.m__charQueue,this.m__charPut)[dbg_index]=t_data
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<132>";
					this.m__charPut+=1;
				}
			}
		}
	}
	pop_err();
}
c_InputDevice.prototype.p_MouseEvent=function(t_event,t_data,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<138>";
	var t_2=t_event;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<139>";
	if(t_2==4){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<140>";
		this.p_KeyEvent(1,1+t_data);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<141>";
		if(t_2==5){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<142>";
			this.p_KeyEvent(2,1+t_data);
			pop_err();
			return;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<144>";
			if(t_2==6){
			}else{
				pop_err();
				return;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<148>";
	this.m__mouseX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<149>";
	this.m__mouseY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<150>";
	dbg_array(this.m__touchX,0)[dbg_index]=t_x
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<151>";
	dbg_array(this.m__touchY,0)[dbg_index]=t_y
	pop_err();
}
c_InputDevice.prototype.p_TouchEvent=function(t_event,t_data,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<155>";
	var t_3=t_event;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<156>";
	if(t_3==7){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<157>";
		this.p_KeyEvent(1,384+t_data);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<158>";
		if(t_3==8){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<159>";
			this.p_KeyEvent(2,384+t_data);
			pop_err();
			return;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<161>";
			if(t_3==9){
			}else{
				pop_err();
				return;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<165>";
	dbg_array(this.m__touchX,t_data)[dbg_index]=t_x
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<166>";
	dbg_array(this.m__touchY,t_data)[dbg_index]=t_y
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<167>";
	if(t_data==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<168>";
		this.m__mouseX=t_x;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<169>";
		this.m__mouseY=t_y;
	}
	pop_err();
}
c_InputDevice.prototype.p_MotionEvent=function(t_event,t_data,t_x,t_y,t_z){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<174>";
	var t_4=t_event;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<175>";
	if(t_4==10){
	}else{
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<179>";
	this.m__accelX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<180>";
	this.m__accelY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<181>";
	this.m__accelZ=t_z;
	pop_err();
}
c_InputDevice.prototype.p_MouseX=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<65>";
	pop_err();
	return this.m__mouseX;
}
c_InputDevice.prototype.p_MouseY=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<69>";
	pop_err();
	return this.m__mouseY;
}
c_InputDevice.prototype.p_KeyHit=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<48>";
	if(t_key>0 && t_key<512){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<48>";
		pop_err();
		return dbg_array(this.m__keyHit,t_key)[dbg_index];
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<49>";
	pop_err();
	return 0;
}
c_InputDevice.prototype.p_KeyDown=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<43>";
	if(t_key>0 && t_key<512){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<43>";
		pop_err();
		return dbg_array(this.m__keyDown,t_key)[dbg_index];
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<44>";
	pop_err();
	return false;
}
c_InputDevice.prototype.p_TouchX=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<73>";
	if(t_index>=0 && t_index<32){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<73>";
		pop_err();
		return dbg_array(this.m__touchX,t_index)[dbg_index];
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<74>";
	pop_err();
	return 0.0;
}
c_InputDevice.prototype.p_TouchY=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<78>";
	if(t_index>=0 && t_index<32){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<78>";
		pop_err();
		return dbg_array(this.m__touchY,t_index)[dbg_index];
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<79>";
	pop_err();
	return 0.0;
}
function c_JoyState(){
	Object.call(this);
	this.m_joyx=new_number_array(2);
	this.m_joyy=new_number_array(2);
	this.m_joyz=new_number_array(2);
	this.m_buttons=new_bool_array(32);
}
c_JoyState.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<10>";
	pop_err();
	return this;
}
var bb_input_device=null;
function bb_input_SetInputDevice(t_dev){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<18>";
	bb_input_device=t_dev;
	pop_err();
	return 0;
}
var bb_graphics_renderDevice=null;
function bb_graphics_SetMatrix(t_ix,t_iy,t_jx,t_jy,t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<311>";
	dbg_object(bb_graphics_context).m_ix=t_ix;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<312>";
	dbg_object(bb_graphics_context).m_iy=t_iy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<313>";
	dbg_object(bb_graphics_context).m_jx=t_jx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<314>";
	dbg_object(bb_graphics_context).m_jy=t_jy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<315>";
	dbg_object(bb_graphics_context).m_tx=t_tx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<316>";
	dbg_object(bb_graphics_context).m_ty=t_ty;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<317>";
	dbg_object(bb_graphics_context).m_tformed=((t_ix!=1.0 || t_iy!=0.0 || t_jx!=0.0 || t_jy!=1.0 || t_tx!=0.0 || t_ty!=0.0)?1:0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<318>";
	dbg_object(bb_graphics_context).m_matDirty=1;
	pop_err();
	return 0;
}
function bb_graphics_SetMatrix2(t_m){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<307>";
	bb_graphics_SetMatrix(dbg_array(t_m,0)[dbg_index],dbg_array(t_m,1)[dbg_index],dbg_array(t_m,2)[dbg_index],dbg_array(t_m,3)[dbg_index],dbg_array(t_m,4)[dbg_index],dbg_array(t_m,5)[dbg_index]);
	pop_err();
	return 0;
}
function bb_graphics_SetColor(t_r,t_g,t_b){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<253>";
	dbg_object(bb_graphics_context).m_color_r=t_r;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<254>";
	dbg_object(bb_graphics_context).m_color_g=t_g;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<255>";
	dbg_object(bb_graphics_context).m_color_b=t_b;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<256>";
	bb_graphics_renderDevice.SetColor(t_r,t_g,t_b);
	pop_err();
	return 0;
}
function bb_graphics_SetAlpha(t_alpha){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<270>";
	dbg_object(bb_graphics_context).m_alpha=t_alpha;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<271>";
	bb_graphics_renderDevice.SetAlpha(t_alpha);
	pop_err();
	return 0;
}
function bb_graphics_SetBlend(t_blend){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<279>";
	dbg_object(bb_graphics_context).m_blend=t_blend;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<280>";
	bb_graphics_renderDevice.SetBlend(t_blend);
	pop_err();
	return 0;
}
function bb_graphics_DeviceWidth(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<230>";
	var t_=bb_graphics_device.Width();
	pop_err();
	return t_;
}
function bb_graphics_DeviceHeight(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<234>";
	var t_=bb_graphics_device.Height();
	pop_err();
	return t_;
}
function bb_graphics_SetScissor(t_x,t_y,t_width,t_height){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<288>";
	dbg_object(bb_graphics_context).m_scissor_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<289>";
	dbg_object(bb_graphics_context).m_scissor_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<290>";
	dbg_object(bb_graphics_context).m_scissor_width=t_width;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<291>";
	dbg_object(bb_graphics_context).m_scissor_height=t_height;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<292>";
	bb_graphics_renderDevice.SetScissor(((t_x)|0),((t_y)|0),((t_width)|0),((t_height)|0));
	pop_err();
	return 0;
}
function bb_graphics_BeginRender(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<216>";
	bb_graphics_renderDevice=bb_graphics_device;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<217>";
	dbg_object(bb_graphics_context).m_matrixSp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<218>";
	bb_graphics_SetMatrix(1.0,0.0,0.0,1.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>";
	bb_graphics_SetColor(255.0,255.0,255.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<220>";
	bb_graphics_SetAlpha(1.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<221>";
	bb_graphics_SetBlend(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<222>";
	bb_graphics_SetScissor(0.0,0.0,(bb_graphics_DeviceWidth()),(bb_graphics_DeviceHeight()));
	pop_err();
	return 0;
}
function bb_graphics_EndRender(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<226>";
	bb_graphics_renderDevice=null;
	pop_err();
	return 0;
}
function c_BBGameEvent(){
	Object.call(this);
}
function bb_app_EndApp(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<186>";
	error("");
	pop_err();
	return 0;
}
var bb_framework_DEVICE_WIDTH=0;
var bb_framework_DEVICE_HEIGHT=0;
var bb_framework_SCREEN_WIDTH=0;
var bb_framework_SCREEN_HEIGHT=0;
var bb_framework_SCREEN_WIDTH2=0;
var bb_framework_SCREEN_HEIGHT2=0;
var bb_framework_SCREENX_RATIO=0;
var bb_framework_SCREENY_RATIO=0;
function bb_input_MouseX(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<54>";
	var t_=bb_input_device.p_MouseX();
	pop_err();
	return t_;
}
function bb_input_MouseY(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<58>";
	var t_=bb_input_device.p_MouseY();
	pop_err();
	return t_;
}
var bb_random_Seed=0;
function c_DeltaTimer(){
	Object.call(this);
	this.m_targetfps=60.0;
	this.m_lastticks=.0;
	this.m_delta=.0;
	this.m_frametime=.0;
	this.m_currentticks=.0;
}
c_DeltaTimer.m_new=function(t_fps){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<979>";
	this.m_targetfps=t_fps;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<980>";
	this.m_lastticks=(bb_app_Millisecs());
	pop_err();
	return this;
}
c_DeltaTimer.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<971>";
	pop_err();
	return this;
}
c_DeltaTimer.prototype.p_UpdateDelta=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<984>";
	this.m_currentticks=(bb_app_Millisecs());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<985>";
	this.m_frametime=this.m_currentticks-this.m_lastticks;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<986>";
	this.m_delta=this.m_frametime/(1000.0/this.m_targetfps);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<987>";
	this.m_lastticks=this.m_currentticks;
	pop_err();
}
function bb_app_Millisecs(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<160>";
	var t_=bb_app__game.Millisecs();
	pop_err();
	return t_;
}
var bb_framework_dt=null;
var bb_app__updateRate=0;
function bb_app_SetUpdateRate(t_hertz){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<151>";
	bb_app__updateRate=t_hertz;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<152>";
	bb_app__game.SetUpdateRate(t_hertz);
	pop_err();
	return 0;
}
function c_Sprite(){
	Object.call(this);
	this.m_image=null;
	this.m_x=.0;
	this.m_y=.0;
	this.m_alpha=1.0;
	this.m_hitBox=null;
	this.m_visible=true;
	this.m_frame=0;
	this.m_frameStart=0;
	this.m_frameEnd=0;
	this.m_reverse=false;
	this.m_pingPong=false;
	this.m_loop=true;
	this.m_frameSpeed=0;
	this.m_frameTimer=0;
	this.m_ping=0;
	this.m_scaleX=1.0;
	this.m_scaleY=1.0;
	this.m_red=255;
	this.m_green=255;
	this.m_blue=255;
	this.m_rotation=.0;
}
c_Sprite.prototype.p_SetHitBox=function(t_hitX,t_hitY,t_hitWidth,t_hitHeight){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1998>";
	this.m_hitBox=c_HitBox.m_new.call(new c_HitBox,(t_hitX),(t_hitY),(t_hitWidth),(t_hitHeight));
	pop_err();
}
c_Sprite.m_new=function(t_img,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1804>";
	dbg_object(this).m_image=t_img;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1805>";
	dbg_object(this).m_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1806>";
	dbg_object(this).m_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1807>";
	dbg_object(this).m_alpha=1.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1808>";
	this.p_SetHitBox(((-dbg_object(t_img).m_image.p_HandleX())|0),((-dbg_object(t_img).m_image.p_HandleY())|0),dbg_object(t_img).m_w,dbg_object(t_img).m_h);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1809>";
	dbg_object(this).m_visible=true;
	pop_err();
	return this;
}
c_Sprite.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1764>";
	pop_err();
	return this;
}
c_Sprite.prototype.p_SetFrame=function(t_startFrame,t_endFrame,t_speed,t_pingPong,t_loop){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1878>";
	this.m_frame=t_startFrame;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1879>";
	this.m_frameStart=t_startFrame;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1880>";
	this.m_frameEnd=t_endFrame;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1881>";
	if(t_startFrame>t_endFrame){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1882>";
		this.m_reverse=true;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1884>";
		this.m_reverse=false;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1886>";
	dbg_object(this).m_pingPong=t_pingPong;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1887>";
	dbg_object(this).m_loop=t_loop;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1888>";
	this.m_frameSpeed=t_speed;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1889>";
	this.m_frameTimer=bb_app_Millisecs();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1890>";
	this.m_ping=0;
	pop_err();
}
c_Sprite.prototype.p_ResetAnim=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1916>";
	if(this.m_loop){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1917>";
		if(this.m_pingPong){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1918>";
			this.m_reverse=!this.m_reverse;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1919>";
			this.m_frame=this.m_frameEnd;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1920>";
			var t_ts=this.m_frameStart;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1921>";
			this.m_frameStart=this.m_frameEnd;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1922>";
			this.m_frameEnd=t_ts;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1924>";
			this.m_frame=this.m_frameStart;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1927>";
		if(this.m_pingPong && this.m_ping<1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1928>";
			this.m_reverse=!this.m_reverse;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1929>";
			this.m_frame=this.m_frameEnd;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1930>";
			var t_ts2=this.m_frameStart;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1931>";
			this.m_frameStart=this.m_frameEnd;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1932>";
			this.m_frameEnd=t_ts2;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1933>";
			this.m_ping+=1;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1935>";
			this.m_frame=this.m_frameEnd;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1936>";
			pop_err();
			return 1;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1939>";
	pop_err();
	return 0;
}
c_Sprite.prototype.p_UpdateAnimation=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1895>";
	var t_rv=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1896>";
	if(this.m_frameSpeed>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1897>";
		if(bb_app_Millisecs()>this.m_frameTimer+this.m_frameSpeed){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1898>";
			if(!this.m_reverse){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1899>";
				this.m_frame+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1900>";
				if(this.m_frame>this.m_frameEnd){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1901>";
					t_rv=this.p_ResetAnim();
				}
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1904>";
				this.m_frame-=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1905>";
				if(this.m_frame<this.m_frameEnd){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1906>";
					t_rv=this.p_ResetAnim();
				}
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1909>";
			this.m_frameTimer=bb_app_Millisecs();
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1912>";
	pop_err();
	return t_rv;
}
c_Sprite.prototype.p_Draw3=function(t_offsetx,t_offsety,t_rounded){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1951>";
	if(!this.m_visible){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1956>";
	if(this.m_x-t_offsetx+(dbg_object(this.m_image).m_w)*this.m_scaleX+(dbg_object(this.m_image).m_h)*this.m_scaleY<0.0 || this.m_x-t_offsetx-(dbg_object(this.m_image).m_w)*this.m_scaleX-(dbg_object(this.m_image).m_h)*this.m_scaleY>=bb_framework_SCREEN_WIDTH || this.m_y-t_offsety+(dbg_object(this.m_image).m_h)*this.m_scaleY+(dbg_object(this.m_image).m_w)*this.m_scaleX<0.0 || this.m_y-t_offsety-(dbg_object(this.m_image).m_h)*this.m_scaleY-(dbg_object(this.m_image).m_w)*this.m_scaleX>=bb_framework_SCREEN_HEIGHT){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1958>";
	if(dbg_object(this).m_alpha>1.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1958>";
		dbg_object(this).m_alpha=1.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1959>";
	if(dbg_object(this).m_alpha<0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1959>";
		dbg_object(this).m_alpha=0.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1961>";
	bb_graphics_SetAlpha(dbg_object(this).m_alpha);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1962>";
	bb_graphics_SetColor((this.m_red),(this.m_green),(this.m_blue));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1963>";
	if(t_rounded){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1964>";
		bb_graphics_DrawImage2(dbg_object(this.m_image).m_image,Math.floor(this.m_x-t_offsetx+0.5),Math.floor(this.m_y-t_offsety+0.5),this.m_rotation,this.m_scaleX,this.m_scaleY,this.m_frame);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1966>";
		bb_graphics_DrawImage2(dbg_object(this.m_image).m_image,this.m_x-t_offsetx,this.m_y-t_offsety,this.m_rotation,this.m_scaleX,this.m_scaleY,this.m_frame);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1969>";
	bb_graphics_SetColor(255.0,255.0,255.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1970>";
	bb_graphics_SetAlpha(1.0);
	pop_err();
}
c_Sprite.prototype.p_Draw4=function(t_rounded){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1947>";
	this.p_Draw3(0.0,0.0,t_rounded);
	pop_err();
}
c_Sprite.prototype.p_Draw=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1943>";
	this.p_Draw3(0.0,0.0,false);
	pop_err();
}
c_Sprite.prototype.p_DrawHitBox=function(t_offsetx,t_offsety){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1974>";
	if(!this.m_visible){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1976>";
	bb_graphics_DrawRect(this.m_x-1.0-t_offsetx,this.m_y-1.0-t_offsety,2.0,2.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1978>";
	bb_functions_DrawRectOutline(((this.m_x+dbg_object(this.m_hitBox).m_x-t_offsetx)|0),((this.m_y+dbg_object(this.m_hitBox).m_y-t_offsety)|0),((dbg_object(this.m_hitBox).m_w)|0),((dbg_object(this.m_hitBox).m_h)|0));
	pop_err();
}
function c_Particle(){
	c_Sprite.call(this);
}
c_Particle.prototype=extend_class(c_Sprite);
c_Particle.m_MAX_PARTICLES=0;
c_Particle.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2016>";
	c_Sprite.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2016>";
	pop_err();
	return this;
}
c_Particle.m_particles=[];
c_Particle.m_Cache=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2031>";
	for(var t_i=0;t_i<=c_Particle.m_MAX_PARTICLES-1;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2032>";
		dbg_array(c_Particle.m_particles,t_i)[dbg_index]=c_Particle.m_new.call(new c_Particle)
	}
	pop_err();
}
function c_HitBox(){
	Object.call(this);
	this.m_x=.0;
	this.m_y=.0;
	this.m_w=.0;
	this.m_h=.0;
}
c_HitBox.m_new=function(t_x,t_y,t_w,t_h){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2008>";
	dbg_object(this).m_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2009>";
	dbg_object(this).m_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2010>";
	dbg_object(this).m_w=t_w;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2011>";
	dbg_object(this).m_h=t_h;
	pop_err();
	return this;
}
c_HitBox.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2003>";
	pop_err();
	return this;
}
function c_FPSCounter(){
	Object.call(this);
}
c_FPSCounter.m_startTime=0;
c_FPSCounter.m_fpsCount=0;
c_FPSCounter.m_totalFPS=0;
c_FPSCounter.m_Update=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<956>";
	if(bb_app_Millisecs()-c_FPSCounter.m_startTime>=1000){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<957>";
		c_FPSCounter.m_totalFPS=c_FPSCounter.m_fpsCount;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<958>";
		c_FPSCounter.m_fpsCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<959>";
		c_FPSCounter.m_startTime=bb_app_Millisecs();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<961>";
		c_FPSCounter.m_fpsCount+=1;
	}
	pop_err();
}
c_FPSCounter.m_Draw=function(t_x,t_y,t_ax,t_ay){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<966>";
	bb_graphics_DrawText("FPS: "+String(c_FPSCounter.m_totalFPS),(t_x),(t_y),t_ax,t_ay);
	pop_err();
}
function bb_graphics_PushMatrix(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<332>";
	var t_sp=dbg_object(bb_graphics_context).m_matrixSp;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<333>";
	dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+0)[dbg_index]=dbg_object(bb_graphics_context).m_ix
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<334>";
	dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+1)[dbg_index]=dbg_object(bb_graphics_context).m_iy
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<335>";
	dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+2)[dbg_index]=dbg_object(bb_graphics_context).m_jx
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<336>";
	dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+3)[dbg_index]=dbg_object(bb_graphics_context).m_jy
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<337>";
	dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+4)[dbg_index]=dbg_object(bb_graphics_context).m_tx
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<338>";
	dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+5)[dbg_index]=dbg_object(bb_graphics_context).m_ty
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<339>";
	dbg_object(bb_graphics_context).m_matrixSp=t_sp+6;
	pop_err();
	return 0;
}
function bb_math_Max(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<56>";
	if(t_x>t_y){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<56>";
		pop_err();
		return t_x;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<57>";
	pop_err();
	return t_y;
}
function bb_math_Max2(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<83>";
	if(t_x>t_y){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<83>";
		pop_err();
		return t_x;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<84>";
	pop_err();
	return t_y;
}
function bb_math_Min(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<51>";
	if(t_x<t_y){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<51>";
		pop_err();
		return t_x;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<52>";
	pop_err();
	return t_y;
}
function bb_math_Min2(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<78>";
	if(t_x<t_y){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<78>";
		pop_err();
		return t_x;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<79>";
	pop_err();
	return t_y;
}
function bb_graphics_DebugRenderDevice(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<49>";
	if(!((bb_graphics_renderDevice)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<49>";
		error("Rendering operations can only be performed inside OnRender");
	}
	pop_err();
	return 0;
}
function bb_graphics_Cls(t_r,t_g,t_b){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<376>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<378>";
	bb_graphics_renderDevice.Cls(t_r,t_g,t_b);
	pop_err();
	return 0;
}
function bb_graphics_Transform(t_ix,t_iy,t_jx,t_jy,t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<353>";
	var t_ix2=t_ix*dbg_object(bb_graphics_context).m_ix+t_iy*dbg_object(bb_graphics_context).m_jx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<354>";
	var t_iy2=t_ix*dbg_object(bb_graphics_context).m_iy+t_iy*dbg_object(bb_graphics_context).m_jy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<355>";
	var t_jx2=t_jx*dbg_object(bb_graphics_context).m_ix+t_jy*dbg_object(bb_graphics_context).m_jx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<356>";
	var t_jy2=t_jx*dbg_object(bb_graphics_context).m_iy+t_jy*dbg_object(bb_graphics_context).m_jy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<357>";
	var t_tx2=t_tx*dbg_object(bb_graphics_context).m_ix+t_ty*dbg_object(bb_graphics_context).m_jx+dbg_object(bb_graphics_context).m_tx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<358>";
	var t_ty2=t_tx*dbg_object(bb_graphics_context).m_iy+t_ty*dbg_object(bb_graphics_context).m_jy+dbg_object(bb_graphics_context).m_ty;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<359>";
	bb_graphics_SetMatrix(t_ix2,t_iy2,t_jx2,t_jy2,t_tx2,t_ty2);
	pop_err();
	return 0;
}
function bb_graphics_Transform2(t_m){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<349>";
	bb_graphics_Transform(dbg_array(t_m,0)[dbg_index],dbg_array(t_m,1)[dbg_index],dbg_array(t_m,2)[dbg_index],dbg_array(t_m,3)[dbg_index],dbg_array(t_m,4)[dbg_index],dbg_array(t_m,5)[dbg_index]);
	pop_err();
	return 0;
}
function bb_graphics_Scale(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<367>";
	bb_graphics_Transform(t_x,0.0,0.0,t_y,0.0,0.0);
	pop_err();
	return 0;
}
function bb_graphics_Translate(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<363>";
	bb_graphics_Transform(1.0,0.0,0.0,1.0,t_x,t_y);
	pop_err();
	return 0;
}
function c_DiddyDataLayer(){
	Object.call(this);
	this.m_index=0;
	this.m_objects=c_DiddyDataObjects.m_new.call(new c_DiddyDataObjects);
	this.implments={c_IComparable:1};
}
c_DiddyDataLayer.prototype.p_Render2=function(t_xoffset,t_yoffset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
	var t_=this.m_objects.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
		var t_obj=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<237>";
		if(dbg_object(t_obj).m_visible){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<238>";
			t_obj.p_Render2(t_xoffset,t_yoffset);
		}
	}
	pop_err();
}
function c_ICollection(){
	Object.call(this);
}
c_ICollection.prototype.p_Enumerator=function(){
}
c_ICollection.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.p_Enumerator();
	pop_err();
	return t_;
}
c_ICollection.prototype.p_Size=function(){
}
function c_IList(){
	c_ICollection.call(this);
	this.m_modCount=0;
}
c_IList.prototype=extend_class(c_ICollection);
c_IList.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(c_ListEnumerator.m_new.call(new c_ListEnumerator,this));
	pop_err();
	return t_;
}
c_IList.prototype.p_Get2=function(t_index){
}
c_IList.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.p_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
function c_ArrayList(){
	c_IList.call(this);
	this.m_size=0;
	this.m_elements=[];
}
c_ArrayList.prototype=extend_class(c_IList);
c_ArrayList.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(c_ArrayListEnumerator.m_new.call(new c_ArrayListEnumerator,this));
	pop_err();
	return t_;
}
c_ArrayList.prototype.p_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.m_size;
}
c_ArrayList.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.m_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.m_size),null);
	}
	pop_err();
}
c_ArrayList.prototype.p_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.p_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.m_elements,t_index)[dbg_index]),c_DiddyDataLayer);
	pop_err();
	return t_;
}
function c_DiddyDataLayers(){
	c_ArrayList.call(this);
}
c_DiddyDataLayers.prototype=extend_class(c_ArrayList);
function c_IEnumerator(){
	Object.call(this);
}
c_IEnumerator.prototype.p_HasNext=function(){
}
c_IEnumerator.prototype.p_NextObject=function(){
}
c_IEnumerator.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
function c_DiddyDataObject(){
	Object.call(this);
	this.m_visible=true;
	this.m_imageName="";
	this.m_alpha=1.0;
	this.m_image=null;
	this.m_red=255;
	this.m_green=255;
	this.m_blue=255;
	this.m_x=.0;
	this.m_y=.0;
	this.m_rotation=.0;
	this.m_scaleX=.0;
	this.m_scaleY=.0;
}
c_DiddyDataObject.prototype.p_Render2=function(t_xoffset,t_yoffset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<309>";
	if(((this.m_imageName).length!=0) && this.m_visible && this.m_alpha>0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<310>";
		if(!((this.m_image)!=null)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<310>";
			this.m_image=dbg_object(bb_framework_diddyGame).m_images.p_Find(this.m_imageName);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<311>";
		if((this.m_image)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<312>";
			bb_graphics_SetColor((this.m_red),(this.m_green),(this.m_blue));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<313>";
			bb_graphics_SetAlpha(this.m_alpha);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<314>";
			this.m_image.p_Draw2(this.m_x+t_xoffset,this.m_y+t_yoffset,this.m_rotation,this.m_scaleX,this.m_scaleY,0);
		}
	}
	pop_err();
}
function c_ICollection2(){
	Object.call(this);
}
c_ICollection2.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>";
	pop_err();
	return this;
}
c_ICollection2.prototype.p_ToArray=function(){
}
c_ICollection2.prototype.p_Enumerator=function(){
}
c_ICollection2.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.p_Enumerator();
	pop_err();
	return t_;
}
c_ICollection2.prototype.p_Size=function(){
}
function c_IList2(){
	c_ICollection2.call(this);
	this.m_modCount=0;
}
c_IList2.prototype=extend_class(c_ICollection2);
c_IList2.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	c_ICollection2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	pop_err();
	return this;
}
c_IList2.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(c_ListEnumerator2.m_new.call(new c_ListEnumerator2,this));
	pop_err();
	return t_;
}
c_IList2.prototype.p_Get2=function(t_index){
}
c_IList2.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.p_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
function c_ArrayList2(){
	c_IList2.call(this);
	this.m_elements=[];
	this.m_size=0;
}
c_ArrayList2.prototype=extend_class(c_IList2);
c_ArrayList2.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>";
	c_IList2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>";
	dbg_object(this).m_elements=new_object_array(10);
	pop_err();
	return this;
}
c_ArrayList2.m_new2=function(t_initialCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>";
	c_IList2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
	if(t_initialCapacity<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Capacity must be >= 0",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>";
	dbg_object(this).m_elements=new_object_array(t_initialCapacity);
	pop_err();
	return this;
}
c_ArrayList2.m_new3=function(t_c){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>";
	c_IList2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
	if(!((t_c)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Source collection must not be null",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>";
	this.m_elements=t_c.p_ToArray();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>";
	this.m_size=this.m_elements.length;
	pop_err();
	return this;
}
c_ArrayList2.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(c_ArrayListEnumerator2.m_new.call(new c_ArrayListEnumerator2,this));
	pop_err();
	return t_;
}
c_ArrayList2.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>";
	var t_arr=new_object_array(this.m_size);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>";
	for(var t_i=0;t_i<this.m_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>";
		dbg_array(t_arr,t_i)[dbg_index]=dbg_array(this.m_elements,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>";
	pop_err();
	return t_arr;
}
c_ArrayList2.prototype.p_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.m_size;
}
c_ArrayList2.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.m_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.m_size),null);
	}
	pop_err();
}
c_ArrayList2.prototype.p_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.p_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.m_elements,t_index)[dbg_index]),c_DiddyDataObject);
	pop_err();
	return t_;
}
function c_DiddyDataObjects(){
	c_ArrayList2.call(this);
}
c_DiddyDataObjects.prototype=extend_class(c_ArrayList2);
c_DiddyDataObjects.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<244>";
	c_ArrayList2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<244>";
	pop_err();
	return this;
}
function c_IEnumerator2(){
	Object.call(this);
}
c_IEnumerator2.prototype.p_HasNext=function(){
}
c_IEnumerator2.prototype.p_NextObject=function(){
}
c_IEnumerator2.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
function c_MapKeys(){
	Object.call(this);
	this.m_map=null;
}
c_MapKeys.m_new=function(t_map){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>";
	dbg_object(this).m_map=t_map;
	pop_err();
	return this;
}
c_MapKeys.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>";
	pop_err();
	return this;
}
c_MapKeys.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>";
	var t_=c_KeyEnumerator.m_new.call(new c_KeyEnumerator,this.m_map.p_FirstNode());
	pop_err();
	return t_;
}
function c_KeyEnumerator(){
	Object.call(this);
	this.m_node=null;
}
c_KeyEnumerator.m_new=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>";
	dbg_object(this).m_node=t_node;
	pop_err();
	return this;
}
c_KeyEnumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>";
	pop_err();
	return this;
}
c_KeyEnumerator.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>";
	var t_=this.m_node!=null;
	pop_err();
	return t_;
}
c_KeyEnumerator.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>";
	var t_t=this.m_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>";
	this.m_node=this.m_node.p_NextNode();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>";
	pop_err();
	return dbg_object(t_t).m_key;
}
function c_Node2(){
	Object.call(this);
	this.m_left=null;
	this.m_right=null;
	this.m_parent=null;
	this.m_key="";
	this.m_value=null;
	this.m_color=0;
}
c_Node2.prototype.p_NextNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>";
	var t_node=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>";
	if((this.m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>";
		t_node=this.m_right;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>";
		while((dbg_object(t_node).m_left)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>";
			t_node=dbg_object(t_node).m_left;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>";
		pop_err();
		return t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>";
	t_node=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>";
	var t_parent=dbg_object(this).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>";
	while(((t_parent)!=null) && t_node==dbg_object(t_parent).m_right){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>";
		t_node=t_parent;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>";
		t_parent=dbg_object(t_parent).m_parent;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>";
	pop_err();
	return t_parent;
}
c_Node2.m_new=function(t_key,t_value,t_color,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>";
	dbg_object(this).m_key=t_key;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>";
	dbg_object(this).m_value=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>";
	dbg_object(this).m_color=t_color;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>";
	dbg_object(this).m_parent=t_parent;
	pop_err();
	return this;
}
c_Node2.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>";
	pop_err();
	return this;
}
function bb_assert_AssertError(t_msg){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<138>";
	throw c_AssertException.m_new.call(new c_AssertException,t_msg,null);
}
function bb_assert_AssertNotNull(t_val,t_msg){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<31>";
	if(t_val==null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<31>";
		bb_assert_AssertError(t_msg);
	}
	pop_err();
}
function bb_graphics_DrawImage(t_image,t_x,t_y,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<449>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<450>";
	if(t_frame<0 || t_frame>=dbg_object(t_image).m_frames.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<450>";
		error("Invalid image frame");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<453>";
	var t_f=dbg_array(dbg_object(t_image).m_frames,t_frame)[dbg_index];
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<455>";
	bb_graphics_context.p_Validate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<457>";
	if((dbg_object(t_image).m_flags&65536)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<458>";
		bb_graphics_renderDevice.DrawSurface(dbg_object(t_image).m_surface,t_x-dbg_object(t_image).m_tx,t_y-dbg_object(t_image).m_ty);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<460>";
		bb_graphics_renderDevice.DrawSurface2(dbg_object(t_image).m_surface,t_x-dbg_object(t_image).m_tx,t_y-dbg_object(t_image).m_ty,dbg_object(t_f).m_x,dbg_object(t_f).m_y,dbg_object(t_image).m_width,dbg_object(t_image).m_height);
	}
	pop_err();
	return 0;
}
function bb_graphics_Rotate(t_angle){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<371>";
	bb_graphics_Transform(Math.cos((t_angle)*D2R),-Math.sin((t_angle)*D2R),Math.sin((t_angle)*D2R),Math.cos((t_angle)*D2R),0.0,0.0);
	pop_err();
	return 0;
}
function bb_graphics_PopMatrix(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<343>";
	var t_sp=dbg_object(bb_graphics_context).m_matrixSp-6;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<344>";
	bb_graphics_SetMatrix(dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+0)[dbg_index],dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+1)[dbg_index],dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+2)[dbg_index],dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+3)[dbg_index],dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+4)[dbg_index],dbg_array(dbg_object(bb_graphics_context).m_matrixStack,t_sp+5)[dbg_index]);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<345>";
	dbg_object(bb_graphics_context).m_matrixSp=t_sp;
	pop_err();
	return 0;
}
function bb_graphics_DrawImage2(t_image,t_x,t_y,t_rotation,t_scaleX,t_scaleY,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<467>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<468>";
	if(t_frame<0 || t_frame>=dbg_object(t_image).m_frames.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<468>";
		error("Invalid image frame");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<471>";
	var t_f=dbg_array(dbg_object(t_image).m_frames,t_frame)[dbg_index];
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<473>";
	bb_graphics_PushMatrix();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<475>";
	bb_graphics_Translate(t_x,t_y);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<476>";
	bb_graphics_Rotate(t_rotation);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<477>";
	bb_graphics_Scale(t_scaleX,t_scaleY);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<479>";
	bb_graphics_Translate(-dbg_object(t_image).m_tx,-dbg_object(t_image).m_ty);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<481>";
	bb_graphics_context.p_Validate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<483>";
	if((dbg_object(t_image).m_flags&65536)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<484>";
		bb_graphics_renderDevice.DrawSurface(dbg_object(t_image).m_surface,0.0,0.0);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<486>";
		bb_graphics_renderDevice.DrawSurface2(dbg_object(t_image).m_surface,0.0,0.0,dbg_object(t_f).m_x,dbg_object(t_f).m_y,dbg_object(t_image).m_width,dbg_object(t_image).m_height);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<489>";
	bb_graphics_PopMatrix();
	pop_err();
	return 0;
}
function bb_graphics_DrawRect(t_x,t_y,t_w,t_h){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<391>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<393>";
	bb_graphics_context.p_Validate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<394>";
	bb_graphics_renderDevice.DrawRect(t_x,t_y,t_w,t_h);
	pop_err();
	return 0;
}
function bb_graphics_DrawText(t_text,t_x,t_y,t_xalign,t_yalign){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<574>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<576>";
	if(!((dbg_object(bb_graphics_context).m_font)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<576>";
		pop_err();
		return 0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<578>";
	var t_w=dbg_object(bb_graphics_context).m_font.p_Width();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<579>";
	var t_h=dbg_object(bb_graphics_context).m_font.p_Height();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<581>";
	t_x-=Math.floor((t_w*t_text.length)*t_xalign);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<582>";
	t_y-=Math.floor((t_h)*t_yalign);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<584>";
	for(var t_i=0;t_i<t_text.length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<585>";
		var t_ch=dbg_charCodeAt(t_text,t_i)-dbg_object(bb_graphics_context).m_firstChar;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<586>";
		if(t_ch>=0 && t_ch<dbg_object(bb_graphics_context).m_font.p_Frames()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<587>";
			bb_graphics_DrawImage(dbg_object(bb_graphics_context).m_font,t_x+(t_i*t_w),t_y,t_ch);
		}
	}
	pop_err();
	return 0;
}
function bb_assert_Assert(t_val,t_msg){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<21>";
	if(!t_val){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<21>";
		bb_assert_AssertError(t_msg);
	}
	pop_err();
}
function bb_functions_RSet(t_str,t_n,t_char){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<170>";
	var t_rep="";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<171>";
	for(var t_i=1;t_i<=t_n;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<172>";
		t_rep=t_rep+t_char;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<174>";
	t_str=t_rep+t_str;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<175>";
	var t_=t_str.slice(t_str.length-t_n);
	pop_err();
	return t_;
}
function bb_functions_FormatNumber(t_number,t_decimal,t_comma,t_padleft){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<235>";
	bb_assert_Assert(t_decimal>-1 && t_comma>-1 && t_padleft>-1,"Negative numbers not allowed in FormatNumber()");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<237>";
	var t_str=String(t_number);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<238>";
	var t_dl=t_str.indexOf(".",0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<239>";
	if(t_decimal==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<239>";
		t_decimal=-1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<240>";
	t_str=t_str.slice(0,t_dl+t_decimal+1);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<242>";
	if((t_comma)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<243>";
		while(t_dl>t_comma){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<244>";
			t_str=t_str.slice(0,t_dl-t_comma)+","+t_str.slice(t_dl-t_comma);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<245>";
			t_dl-=t_comma;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<249>";
	if((t_padleft)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<250>";
		var t_paddedLength=t_padleft+t_decimal+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<251>";
		if(t_paddedLength<t_str.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<251>";
			t_str="Error";
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<252>";
		t_str=bb_functions_RSet(t_str,t_paddedLength," ");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<254>";
	pop_err();
	return t_str;
}
function bb_audio_MusicState(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<97>";
	var t_=bb_audio_device.MusicState();
	pop_err();
	return t_;
}
function c_SoundPlayer(){
	Object.call(this);
}
c_SoundPlayer.m_channel=0;
function bb_input_MouseHit(t_button){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<66>";
	var t_=bb_input_device.p_KeyHit(1+t_button);
	pop_err();
	return t_;
}
function bb_input_TouchHit(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<84>";
	var t_=bb_input_device.p_KeyHit(384+t_index);
	pop_err();
	return t_;
}
function bb_input_TouchDown(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<80>";
	var t_=((bb_input_device.p_KeyDown(384+t_index))?1:0);
	pop_err();
	return t_;
}
function bb_input_TouchX(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<72>";
	var t_=bb_input_device.p_TouchX(t_index);
	pop_err();
	return t_;
}
function bb_input_TouchY(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<76>";
	var t_=bb_input_device.p_TouchY(t_index);
	pop_err();
	return t_;
}
function bb_input_MouseDown(t_button){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<62>";
	var t_=((bb_input_device.p_KeyDown(1+t_button))?1:0);
	pop_err();
	return t_;
}
function bb_input_KeyHit(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<40>";
	var t_=bb_input_device.p_KeyHit(t_key);
	pop_err();
	return t_;
}
function bb_input_KeyDown(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<36>";
	var t_=((bb_input_device.p_KeyDown(t_key))?1:0);
	pop_err();
	return t_;
}
function bb_audio_SetMusicVolume(t_volume){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<101>";
	bb_audio_device.SetMusicVolume(t_volume);
	pop_err();
	return 0;
}
function bb_audio_SetChannelVolume(t_channel,t_volume){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<69>";
	bb_audio_device.SetVolume(t_channel,t_volume);
	pop_err();
	return 0;
}
function c_Node3(){
	Object.call(this);
	this.m_key="";
	this.m_right=null;
	this.m_left=null;
	this.m_value=null;
	this.m_color=0;
	this.m_parent=null;
}
c_Node3.m_new=function(t_key,t_value,t_color,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>";
	dbg_object(this).m_key=t_key;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>";
	dbg_object(this).m_value=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>";
	dbg_object(this).m_color=t_color;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>";
	dbg_object(this).m_parent=t_parent;
	pop_err();
	return this;
}
c_Node3.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>";
	pop_err();
	return this;
}
c_Node3.prototype.p_NextNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>";
	var t_node=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>";
	if((this.m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>";
		t_node=this.m_right;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>";
		while((dbg_object(t_node).m_left)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>";
			t_node=dbg_object(t_node).m_left;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>";
		pop_err();
		return t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>";
	t_node=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>";
	var t_parent=dbg_object(this).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>";
	while(((t_parent)!=null) && t_node==dbg_object(t_parent).m_right){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>";
		t_node=t_parent;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>";
		t_parent=dbg_object(t_parent).m_parent;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>";
	pop_err();
	return t_parent;
}
function bb_functions_StripExt(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<194>";
	var t_i=t_path.lastIndexOf(".");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<195>";
	if(t_i!=-1 && t_path.indexOf("/",t_i+1)==-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<195>";
		var t_=t_path.slice(0,t_i);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<196>";
	pop_err();
	return t_path;
}
function bb_functions_StripDir(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<188>";
	var t_i=t_path.lastIndexOf("/");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<189>";
	if(t_i!=-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<189>";
		var t_=t_path.slice(t_i+1);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<190>";
	pop_err();
	return t_path;
}
function bb_functions_StripAll(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<200>";
	var t_=bb_functions_StripDir(bb_functions_StripExt(t_path));
	pop_err();
	return t_;
}
function bb_functions_LoadAnimBitmap(t_path,t_w,t_h,t_count,t_tmpImage){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<115>";
	t_tmpImage=bb_graphics_LoadImage(t_path,1,c_Image.m_DefaultFlags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<117>";
	bb_assert_AssertNotNull((t_tmpImage),"Error loading bitmap "+t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<119>";
	var t_pointer=t_tmpImage.p_GrabImage(0,0,t_w,t_h,t_count,1);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<121>";
	pop_err();
	return t_pointer;
}
function bb_functions_LoadBitmap(t_path,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<106>";
	var t_pointer=bb_graphics_LoadImage(t_path,1,t_flags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<108>";
	bb_assert_AssertNotNull((t_pointer),"Error loading bitmap "+t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<110>";
	pop_err();
	return t_pointer;
}
function c_MapKeys2(){
	Object.call(this);
	this.m_map=null;
}
c_MapKeys2.m_new=function(t_map){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>";
	dbg_object(this).m_map=t_map;
	pop_err();
	return this;
}
c_MapKeys2.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>";
	pop_err();
	return this;
}
c_MapKeys2.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>";
	var t_=c_KeyEnumerator2.m_new.call(new c_KeyEnumerator2,this.m_map.p_FirstNode());
	pop_err();
	return t_;
}
function c_KeyEnumerator2(){
	Object.call(this);
	this.m_node=null;
}
c_KeyEnumerator2.m_new=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>";
	dbg_object(this).m_node=t_node;
	pop_err();
	return this;
}
c_KeyEnumerator2.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>";
	pop_err();
	return this;
}
c_KeyEnumerator2.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>";
	var t_=this.m_node!=null;
	pop_err();
	return t_;
}
c_KeyEnumerator2.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>";
	var t_t=this.m_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>";
	this.m_node=this.m_node.p_NextNode();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>";
	pop_err();
	return dbg_object(t_t).m_key;
}
function c_Node4(){
	Object.call(this);
	this.m_left=null;
	this.m_right=null;
	this.m_parent=null;
	this.m_key="";
	this.m_value=null;
}
c_Node4.prototype.p_NextNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>";
	var t_node=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>";
	if((this.m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>";
		t_node=this.m_right;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>";
		while((dbg_object(t_node).m_left)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>";
			t_node=dbg_object(t_node).m_left;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>";
		pop_err();
		return t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>";
	t_node=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>";
	var t_parent=dbg_object(this).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>";
	while(((t_parent)!=null) && t_node==dbg_object(t_parent).m_right){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>";
		t_node=t_parent;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>";
		t_parent=dbg_object(t_parent).m_parent;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>";
	pop_err();
	return t_parent;
}
function c_Sound(){
	Object.call(this);
	this.m_sample=null;
}
c_Sound.m_new=function(t_sample){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<28>";
	dbg_object(this).m_sample=t_sample;
	pop_err();
	return this;
}
c_Sound.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<25>";
	pop_err();
	return this;
}
function bb_audio_LoadSound(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<43>";
	var t_sample=bb_audio_device.LoadSample(bb_data_FixDataPath(t_path));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<44>";
	if((t_sample)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<44>";
		var t_=c_Sound.m_new.call(new c_Sound,t_sample);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<45>";
	pop_err();
	return null;
}
function bb_functions_LoadSoundSample(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<125>";
	var t_pointer=bb_audio_LoadSound(t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<126>";
	bb_assert_AssertNotNull((t_pointer),"Error loading sound "+t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<127>";
	pop_err();
	return t_pointer;
}
function bb_audio_PlayMusic(t_path,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<81>";
	var t_=bb_audio_device.PlayMusic(bb_data_FixDataPath(t_path),t_flags);
	pop_err();
	return t_;
}
var bb_framework_defaultFadeTime=0;
function c_MapKeys3(){
	Object.call(this);
	this.m_map=null;
}
c_MapKeys3.m_new=function(t_map){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>";
	dbg_object(this).m_map=t_map;
	pop_err();
	return this;
}
c_MapKeys3.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>";
	pop_err();
	return this;
}
c_MapKeys3.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>";
	var t_=c_KeyEnumerator3.m_new.call(new c_KeyEnumerator3,this.m_map.p_FirstNode());
	pop_err();
	return t_;
}
function c_KeyEnumerator3(){
	Object.call(this);
	this.m_node=null;
}
c_KeyEnumerator3.m_new=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>";
	dbg_object(this).m_node=t_node;
	pop_err();
	return this;
}
c_KeyEnumerator3.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>";
	pop_err();
	return this;
}
c_KeyEnumerator3.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>";
	var t_=this.m_node!=null;
	pop_err();
	return t_;
}
c_KeyEnumerator3.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>";
	var t_t=this.m_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>";
	this.m_node=this.m_node.p_NextNode();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>";
	pop_err();
	return dbg_object(t_t).m_key;
}
function bb_app_LoadString(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<147>";
	var t_=bb_app__game.LoadString(bb_data_FixDataPath(t_path));
	pop_err();
	return t_;
}
function bb_assert_AssertNotEqualInt(t_val,t_expected,t_msg){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<57>";
	if(t_val==t_expected){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<57>";
		bb_assert_AssertError(t_msg+" "+String(t_val)+"="+String(t_expected));
	}
	pop_err();
}
function c_XMLParser(){
	Object.call(this);
	this.m_str="";
	this.m_tagsLength=0;
	this.m_quotesLength=0;
	this.m_pisLength=0;
	this.m_tags=[];
	this.m_tagType=[];
	this.m_quotes=[];
	this.m_pis=[];
	this.m_tagCount=0;
	this.m_quoteCount=0;
	this.m_piCount=0;
}
c_XMLParser.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<22>";
	pop_err();
	return this;
}
c_XMLParser.prototype.p_CacheControlCharacters=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<41>";
	this.m_tagsLength=128;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<42>";
	this.m_quotesLength=128;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<43>";
	this.m_pisLength=128;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<44>";
	this.m_tags=new_number_array(this.m_tagsLength);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<45>";
	this.m_tagType=new_number_array(this.m_tagsLength);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<46>";
	this.m_quotes=new_number_array(this.m_quotesLength);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<47>";
	this.m_pis=new_number_array(this.m_quotesLength);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<48>";
	this.m_tagCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<49>";
	this.m_quoteCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<50>";
	this.m_piCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<51>";
	var t_inTag=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<52>";
	var t_inQuote=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<53>";
	var t_inComment=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<54>";
	var t_inCdata=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<55>";
	var t_inDoctype=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<56>";
	var t_inPi=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<57>";
	var t_strlen=this.m_str.length;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<58>";
	for(var t_i=0;t_i<t_strlen;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<60>";
		if(t_inComment){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<61>";
			if(dbg_charCodeAt(this.m_str,t_i)==62 && dbg_charCodeAt(this.m_str,t_i-1)==45 && dbg_charCodeAt(this.m_str,t_i-2)==45){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<62>";
				if(this.m_tagCount+1>=this.m_tagsLength){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<63>";
					this.m_tagsLength*=2;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<64>";
					this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<65>";
					this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<67>";
				dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<68>";
				dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=1
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<69>";
				this.m_tagCount+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<70>";
				t_inComment=false;
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<73>";
			if(t_inCdata){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<74>";
				if(dbg_charCodeAt(this.m_str,t_i)==62 && dbg_charCodeAt(this.m_str,t_i-1)==93 && dbg_charCodeAt(this.m_str,t_i-2)==93){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<75>";
					if(this.m_tagCount+1>=this.m_tagsLength){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<76>";
						this.m_tagsLength*=2;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<77>";
						this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<78>";
						this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<80>";
					dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<81>";
					dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=2
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<82>";
					this.m_tagCount+=1;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<83>";
					t_inCdata=false;
				}
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<86>";
				if(t_inQuote){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<87>";
					if(dbg_charCodeAt(this.m_str,t_i)==34){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<88>";
						if(this.m_quoteCount+1>=this.m_quotesLength){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<89>";
							this.m_quotesLength*=2;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<90>";
							this.m_quotes=resize_number_array(this.m_quotes,this.m_quotesLength);
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<92>";
						dbg_array(this.m_quotes,this.m_quoteCount)[dbg_index]=t_i
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<93>";
						this.m_quoteCount+=1;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<94>";
						t_inQuote=false;
					}
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<97>";
					if(dbg_charCodeAt(this.m_str,t_i)==34){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<98>";
						if(this.m_quoteCount+1>=this.m_quotesLength){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<99>";
							this.m_quotesLength*=2;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<100>";
							this.m_quotes=resize_number_array(this.m_quotes,this.m_quotesLength);
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<102>";
						dbg_array(this.m_quotes,this.m_quoteCount)[dbg_index]=t_i
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<103>";
						this.m_quoteCount+=1;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<104>";
						t_inQuote=true;
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<106>";
						if(t_inPi){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<107>";
							if(dbg_charCodeAt(this.m_str,t_i)==62 && dbg_charCodeAt(this.m_str,t_i-1)==63){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<108>";
								if(this.m_piCount+1>=this.m_pisLength){
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<109>";
									this.m_pisLength*=2;
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<110>";
									this.m_pis=resize_number_array(this.m_pis,this.m_pisLength);
								}
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<112>";
								dbg_array(this.m_pis,this.m_piCount)[dbg_index]=t_i
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<113>";
								this.m_piCount+=1;
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<114>";
								t_inPi=false;
							}
						}else{
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<117>";
							if(t_inDoctype){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<118>";
								if(dbg_charCodeAt(this.m_str,t_i)==62){
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<119>";
									if(this.m_tagCount+1>=this.m_tagsLength){
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<120>";
										this.m_tagsLength*=2;
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<121>";
										this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<122>";
										this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
									}
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<124>";
									dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<125>";
									dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=3
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<126>";
									this.m_tagCount+=1;
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<127>";
									t_inDoctype=false;
								}
							}else{
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<130>";
								if(dbg_charCodeAt(this.m_str,t_i)==60){
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<132>";
									if(t_inTag){
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<132>";
										throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Invalid less than!",null);
									}
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<134>";
									if(dbg_charCodeAt(this.m_str,t_i+1)==33){
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<136>";
										if(dbg_charCodeAt(this.m_str,t_i+2)==45 && dbg_charCodeAt(this.m_str,t_i+3)==45){
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<137>";
											if(this.m_tagCount+1>=this.m_tagsLength){
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<138>";
												this.m_tagsLength*=2;
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<139>";
												this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<140>";
												this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
											}
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<142>";
											dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<143>";
											dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=1
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<144>";
											this.m_tagCount+=1;
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<145>";
											t_inComment=true;
										}else{
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<153>";
											if(dbg_charCodeAt(this.m_str,t_i+2)==91 && (dbg_charCodeAt(this.m_str,t_i+3)==67 || dbg_charCodeAt(this.m_str,t_i+3)==99) && (dbg_charCodeAt(this.m_str,t_i+4)==68 || dbg_charCodeAt(this.m_str,t_i+4)==100) && (dbg_charCodeAt(this.m_str,t_i+5)==65 || dbg_charCodeAt(this.m_str,t_i+5)==97) && (dbg_charCodeAt(this.m_str,t_i+6)==84 || dbg_charCodeAt(this.m_str,t_i+6)==116) && (dbg_charCodeAt(this.m_str,t_i+7)==65 || dbg_charCodeAt(this.m_str,t_i+7)==97) && dbg_charCodeAt(this.m_str,t_i+8)==91){
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<154>";
												if(this.m_tagCount+1>=this.m_tagsLength){
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<155>";
													this.m_tagsLength*=2;
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<156>";
													this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<157>";
													this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
												}
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<159>";
												dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<160>";
												dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=2
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<161>";
												this.m_tagCount+=1;
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<162>";
												t_inCdata=true;
											}else{
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<170>";
												if((dbg_charCodeAt(this.m_str,t_i+2)==68 || dbg_charCodeAt(this.m_str,t_i+2)==100) && (dbg_charCodeAt(this.m_str,t_i+3)==79 || dbg_charCodeAt(this.m_str,t_i+3)==111) && (dbg_charCodeAt(this.m_str,t_i+4)==67 || dbg_charCodeAt(this.m_str,t_i+4)==99) && (dbg_charCodeAt(this.m_str,t_i+5)==84 || dbg_charCodeAt(this.m_str,t_i+5)==116) && (dbg_charCodeAt(this.m_str,t_i+6)==89 || dbg_charCodeAt(this.m_str,t_i+6)==121) && (dbg_charCodeAt(this.m_str,t_i+7)==80 || dbg_charCodeAt(this.m_str,t_i+7)==112) && (dbg_charCodeAt(this.m_str,t_i+8)==69 || dbg_charCodeAt(this.m_str,t_i+8)==101)){
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<171>";
													if(this.m_tagCount+1>=this.m_tagsLength){
														err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<172>";
														this.m_tagsLength*=2;
														err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<173>";
														this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
														err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<174>";
														this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
													}
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<176>";
													dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<177>";
													dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=3
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<178>";
													this.m_tagCount+=1;
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<179>";
													t_inDoctype=true;
												}else{
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<181>";
													throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Invalid prolog.",null);
												}
											}
										}
									}else{
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<184>";
										if(dbg_charCodeAt(this.m_str,t_i+1)==63){
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<185>";
											if(this.m_piCount+1>=this.m_pisLength){
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<186>";
												this.m_pisLength*=2;
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<187>";
												this.m_pis=resize_number_array(this.m_pis,this.m_pisLength);
											}
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<189>";
											dbg_array(this.m_pis,this.m_piCount)[dbg_index]=t_i
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<190>";
											this.m_piCount+=1;
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<191>";
											t_inPi=true;
										}else{
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<194>";
											if(this.m_tagCount+1>=this.m_tagsLength){
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<195>";
												this.m_tagsLength*=2;
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<196>";
												this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<197>";
												this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
											}
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<199>";
											dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<200>";
											dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=0
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<201>";
											this.m_tagCount+=1;
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<202>";
											t_inTag=true;
										}
									}
								}else{
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<205>";
									if(dbg_charCodeAt(this.m_str,t_i)==62){
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<206>";
										if(!t_inTag){
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<206>";
											throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Invalid greater than!",null);
										}
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<207>";
										if(this.m_tagCount+1==this.m_tagsLength){
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<208>";
											this.m_tagsLength*=2;
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<209>";
											this.m_tags=resize_number_array(this.m_tags,this.m_tagsLength);
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<210>";
											this.m_tagType=resize_number_array(this.m_tagType,this.m_tagsLength);
										}
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<212>";
										dbg_array(this.m_tags,this.m_tagCount)[dbg_index]=t_i
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<213>";
										dbg_array(this.m_tagType,this.m_tagCount)[dbg_index]=0
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<214>";
										this.m_tagCount+=1;
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<215>";
										t_inTag=false;
									}
								}
							}
						}
					}
				}
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<218>";
	if(t_inQuote){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<218>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Unclosed quote!",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<219>";
	if(t_inTag){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<219>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Unclosed tag!",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<220>";
	if(t_inComment){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<220>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Unclosed comment!",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<221>";
	if(t_inCdata){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<221>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Unclosed cdata!",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<222>";
	if(t_inPi){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<222>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.CacheControlCharacters: Unclosed processing instruction!",null);
	}
	pop_err();
}
c_XMLParser.prototype.p_TrimString=function(t_startIdx,t_endIdx,t_trimmed){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<361>";
	var t_trimStart=t_startIdx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<361>";
	var t_trimEnd=t_endIdx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<362>";
	while(t_trimEnd>t_trimStart){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<363>";
		var t_ch=dbg_charCodeAt(this.m_str,t_trimEnd-1);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<364>";
		if(t_ch==13 || t_ch==10 || t_ch==32 || t_ch==9){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<365>";
			t_trimEnd-=1;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<367>";
			break;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<370>";
	while(t_trimStart<t_trimEnd){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<371>";
		var t_ch2=dbg_charCodeAt(this.m_str,t_trimStart);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<372>";
		if(t_ch2==13 || t_ch2==10 || t_ch2==32 || t_ch2==9){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<373>";
			t_trimStart+=1;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<375>";
			break;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<378>";
	dbg_array(t_trimmed,0)[dbg_index]=t_trimStart
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<379>";
	dbg_array(t_trimmed,1)[dbg_index]=t_trimEnd
	pop_err();
}
c_XMLParser.prototype.p_GetTagContents=function(t_startIndex,t_endIndex){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<228>";
	if(t_startIndex==t_endIndex){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<228>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.GetTagContents: Empty tag detected.",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<230>";
	var t_e=c_XMLElement.m_new.call(new c_XMLElement);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<231>";
	var t_a=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<231>";
	var t_singleQuoted=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<231>";
	var t_doubleQuoted=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<231>";
	var t_key="";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<231>";
	var t_value="";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<234>";
	t_a=t_startIndex;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<235>";
	while(t_a<t_endIndex){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<236>";
		if(dbg_charCodeAt(this.m_str,t_a)==32 || dbg_charCodeAt(this.m_str,t_a)==9 || dbg_charCodeAt(this.m_str,t_a)==10 || dbg_charCodeAt(this.m_str,t_a)==13){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<237>";
			dbg_object(t_e).m_name=this.m_str.slice(t_startIndex,t_a);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<238>";
			t_a+=1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<239>";
			break;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<240>";
			if(t_a==t_endIndex-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<241>";
				dbg_object(t_e).m_name=this.m_str.slice(t_startIndex,t_endIndex);
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<243>";
		t_a+=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<245>";
	t_startIndex=t_a;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<249>";
	if(dbg_object(t_e).m_name==""){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<249>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.GetTagContents: Error reading tag name.",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<252>";
	while(t_startIndex<t_endIndex){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<254>";
		while(t_startIndex<t_endIndex && (dbg_charCodeAt(this.m_str,t_startIndex)==32 || dbg_charCodeAt(this.m_str,t_startIndex)==9 || dbg_charCodeAt(this.m_str,t_startIndex)==10 || dbg_charCodeAt(this.m_str,t_startIndex)==13)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<255>";
			t_startIndex+=1;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<259>";
		t_singleQuoted=false;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<260>";
		t_doubleQuoted=false;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<261>";
		t_key="";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<262>";
		t_value="";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<265>";
		t_a=t_startIndex;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<266>";
		while(t_a<t_endIndex){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<267>";
			if(dbg_charCodeAt(this.m_str,t_a)==61 || dbg_charCodeAt(this.m_str,t_a)==32 || dbg_charCodeAt(this.m_str,t_a)==9 || dbg_charCodeAt(this.m_str,t_a)==10 || dbg_charCodeAt(this.m_str,t_a)==13 || t_a==t_endIndex-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<268>";
				if(t_a==t_endIndex-1){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<269>";
					t_key=this.m_str.slice(t_startIndex,t_endIndex);
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<271>";
					t_key=this.m_str.slice(t_startIndex,t_a);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<273>";
				t_a+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<274>";
				break;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<276>";
			t_a+=1;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<278>";
		t_startIndex=t_a;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<281>";
		if(t_key==""){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<282>";
			if(t_a<t_endIndex){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<283>";
				throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.GetTagContents: Error reading attribute key.",null);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<285>";
				break;
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<290>";
		if(dbg_charCodeAt(this.m_str,t_a-1)==61){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<291>";
			t_singleQuoted=false;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<292>";
			t_doubleQuoted=false;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<293>";
			while(t_a<t_endIndex){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<295>";
				if(dbg_charCodeAt(this.m_str,t_a)==39 && !t_doubleQuoted){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<297>";
					if(t_a==t_startIndex){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<298>";
						t_singleQuoted=true;
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<300>";
						if(!t_singleQuoted && !t_doubleQuoted){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<301>";
							throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.GetTagContents: Unexpected single quote detected in attribute value.",null);
						}else{
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<304>";
							t_singleQuoted=false;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<305>";
							t_value=this.m_str.slice(t_startIndex+1,t_a);
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<306>";
							t_a+=1;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<307>";
							break;
						}
					}
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<311>";
					if(dbg_charCodeAt(this.m_str,t_a)==34 && !t_singleQuoted){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<313>";
						if(t_a==t_startIndex){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<314>";
							t_doubleQuoted=true;
						}else{
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<316>";
							if(!t_singleQuoted && !t_doubleQuoted){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<317>";
								throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.GetTagContents: Unexpected double quote detected in attribute value.",null);
							}else{
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<320>";
								t_doubleQuoted=false;
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<321>";
								t_value=this.m_str.slice(t_startIndex+1,t_a);
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<322>";
								t_a+=1;
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<323>";
								break;
							}
						}
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<327>";
						if(t_a==t_endIndex-1 || !t_singleQuoted && !t_doubleQuoted && (dbg_charCodeAt(this.m_str,t_a)==32 || dbg_charCodeAt(this.m_str,t_a)==9 || dbg_charCodeAt(this.m_str,t_a)==10 || dbg_charCodeAt(this.m_str,t_a)==13)){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<328>";
							if(t_a==t_endIndex-1){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<329>";
								t_value=this.m_str.slice(t_startIndex,t_endIndex);
							}else{
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<331>";
								t_value=this.m_str.slice(t_startIndex,t_a);
							}
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<333>";
							t_a+=1;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<334>";
							break;
						}
					}
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<336>";
				t_a+=1;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<338>";
			t_startIndex=t_a;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<339>";
			t_value=bb_xml_UnescapeXMLString(t_value);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<341>";
			if(t_singleQuoted || t_doubleQuoted){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<341>";
				throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.GetTagContents: Unclosed quote detected.",null);
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<345>";
		t_e.p_SetAttribute(t_key,t_value);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<347>";
		if(t_a>=t_endIndex){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<347>";
			break;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<349>";
	pop_err();
	return t_e;
}
c_XMLParser.prototype.p_ParseString=function(t_str){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<384>";
	dbg_object(this).m_str=t_str;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<386>";
	var t_doc=c_XMLDocument.m_new.call(new c_XMLDocument,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<387>";
	var t_elements=c_ArrayList3.m_new.call(new c_ArrayList3);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<388>";
	var t_thisE=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<388>";
	var t_newE=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<389>";
	var t_index=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<389>";
	var t_a=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<389>";
	var t_b=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<389>";
	var t_c=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<389>";
	var t_nextIndex=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<390>";
	var t_trimmed=new_number_array(2);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<393>";
	this.p_CacheControlCharacters();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<396>";
	if(this.m_tagCount==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<396>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.ParseString: Something seriously wrong... no tags!",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<399>";
	t_index=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<400>";
	t_a=dbg_array(this.m_pis,t_index)[dbg_index]+2;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<401>";
	t_b=dbg_array(this.m_pis,t_index+1)[dbg_index]-1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<402>";
	while(t_index<this.m_piCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<403>";
		this.p_TrimString(t_a,t_b,t_trimmed);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<404>";
		if(dbg_array(t_trimmed,0)[dbg_index]!=dbg_array(t_trimmed,1)[dbg_index]){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<405>";
			t_newE=this.p_GetTagContents(dbg_array(t_trimmed,0)[dbg_index],dbg_array(t_trimmed,1)[dbg_index]);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<406>";
			dbg_object(t_newE).m_pi=true;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<407>";
			dbg_object(t_doc).m_pi.p_Add(t_newE);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<408>";
			t_newE=null;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<410>";
			throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.ParseString: Empty processing instruction.",null);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<412>";
		t_index+=2;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<416>";
	t_index=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<417>";
	while(t_index+1<this.m_tagCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<419>";
		if(dbg_array(this.m_tagType,t_index)[dbg_index]==1){
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<423>";
			if(dbg_array(this.m_tagType,t_index)[dbg_index]==2){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<425>";
				t_a=dbg_array(this.m_tags,t_index)[dbg_index]+9;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<426>";
				t_b=dbg_array(this.m_tags,t_index+1)[dbg_index]-2;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<429>";
				t_newE=c_XMLElement.m_new.call(new c_XMLElement);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<430>";
				dbg_object(t_newE).m_cdata=true;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<431>";
				dbg_object(t_newE).m_value=t_str.slice(t_a,t_b);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<432>";
				dbg_object(t_newE).m_parent=t_thisE;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<433>";
				t_thisE.p_AddChild(t_newE);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<434>";
				t_newE=null;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<439>";
				t_a=dbg_array(this.m_tags,t_index)[dbg_index]+1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<440>";
				t_b=dbg_array(this.m_tags,t_index+1)[dbg_index];
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<443>";
				this.p_TrimString(t_a,t_b,t_trimmed);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<446>";
				if(dbg_array(t_trimmed,0)[dbg_index]==dbg_array(t_trimmed,1)[dbg_index]){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<446>";
					throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.ParseString: Empty tag.",null);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<449>";
				if(dbg_charCodeAt(t_str,dbg_array(t_trimmed,0)[dbg_index])==47){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<451>";
					if(t_thisE==null){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<451>";
						throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.ParseString: Closing tag found outside main document tag.",null);
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<454>";
					dbg_array(t_trimmed,0)[dbg_index]+=1
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<457>";
					if(dbg_array(t_trimmed,1)[dbg_index]-dbg_array(t_trimmed,0)[dbg_index]!=dbg_object(t_thisE).m_name.length){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<457>";
						throw c_XMLParseException.m_new.call(new c_XMLParseException,"Closing tag \""+t_str.slice(dbg_array(t_trimmed,0)[dbg_index],dbg_array(t_trimmed,1)[dbg_index])+"\" does not match opening tag \""+dbg_object(t_thisE).m_name+"\"",null);
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<460>";
					for(var t_nameIdx=0;t_nameIdx<dbg_object(t_thisE).m_name.length;t_nameIdx=t_nameIdx+1){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<461>";
						if(dbg_charCodeAt(t_str,dbg_array(t_trimmed,0)[dbg_index]+t_nameIdx)!=dbg_charCodeAt(dbg_object(t_thisE).m_name,t_nameIdx)){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<461>";
							throw c_XMLParseException.m_new.call(new c_XMLParseException,"Closing tag \""+t_str.slice(dbg_array(t_trimmed,0)[dbg_index],dbg_array(t_trimmed,1)[dbg_index])+"\" does not match opening tag \""+dbg_object(t_thisE).m_name+"\"",null);
						}
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<465>";
					if(!t_elements.p_IsEmpty()){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<466>";
						t_thisE=t_elements.p_RemoveLast();
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<469>";
						break;
					}
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<473>";
					if(dbg_charCodeAt(t_str,dbg_array(t_trimmed,1)[dbg_index]-1)==47){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<475>";
						dbg_array(t_trimmed,1)[dbg_index]-=1
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<478>";
						t_newE=this.p_GetTagContents(dbg_array(t_trimmed,0)[dbg_index],dbg_array(t_trimmed,1)[dbg_index]);
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<481>";
						if(dbg_object(t_doc).m_root==null){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<481>";
							dbg_object(t_doc).m_root=t_newE;
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<482>";
						if(t_thisE!=null){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<483>";
							t_thisE.p_AddChild(t_newE);
						}else{
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<486>";
							break;
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<488>";
						t_newE=null;
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<493>";
						t_newE=this.p_GetTagContents(dbg_array(t_trimmed,0)[dbg_index],dbg_array(t_trimmed,1)[dbg_index]);
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<495>";
						if(dbg_object(t_doc).m_root==null){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<495>";
							dbg_object(t_doc).m_root=t_newE;
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<498>";
						if(t_thisE!=null){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<499>";
							t_thisE.p_AddChild(t_newE);
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<503>";
						t_elements.p_AddLast(t_thisE);
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<506>";
						t_thisE=t_newE;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<507>";
						t_newE=null;
					}
				}
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<512>";
		t_index+=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<513>";
		if(t_index<this.m_tagCount){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<514>";
			t_a=dbg_array(this.m_tags,t_index)[dbg_index]+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<515>";
			t_b=dbg_array(this.m_tags,t_index+1)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<516>";
			this.p_TrimString(t_a,t_b,t_trimmed);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<517>";
			if(dbg_array(t_trimmed,0)[dbg_index]!=dbg_array(t_trimmed,1)[dbg_index]){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<518>";
				if(t_thisE!=null){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<519>";
					dbg_object(t_thisE).m_value=dbg_object(t_thisE).m_value+bb_xml_UnescapeXMLString(t_str.slice(dbg_array(t_trimmed,0)[dbg_index],dbg_array(t_trimmed,1)[dbg_index]));
				}
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<527>";
		t_index+=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<529>";
	if(dbg_object(t_doc).m_root==null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<529>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.ParseString: Error parsing XML: no document tag found.",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<530>";
	pop_err();
	return t_doc;
}
c_XMLParser.prototype.p_ParseFile=function(t_filename){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<353>";
	var t_xmlString=bb_app_LoadString(t_filename);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<354>";
	if(!((t_xmlString).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<355>";
		throw c_XMLParseException.m_new.call(new c_XMLParseException,"XMLParser.ParseFile: Error: Cannot load "+t_filename,null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<357>";
	var t_=this.p_ParseString(t_xmlString);
	pop_err();
	return t_;
}
function c_XMLDocument(){
	Object.call(this);
	this.m_root=null;
	this.m_pi=c_ArrayList3.m_new.call(new c_ArrayList3);
}
c_XMLDocument.m_new=function(t_rootName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<546>";
	if(t_rootName!=""){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<546>";
		this.m_root=c_XMLElement.m_new2.call(new c_XMLElement,t_rootName,null);
	}
	pop_err();
	return this;
}
c_XMLDocument.m_new2=function(t_root){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<550>";
	dbg_object(this).m_root=t_root;
	pop_err();
	return this;
}
c_XMLDocument.prototype.p_Root=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<570>";
	pop_err();
	return this.m_root;
}
function c_XMLElement(){
	Object.call(this);
	this.m_parent=null;
	this.m_name="";
	this.m_children=c_ArrayList3.m_new.call(new c_ArrayList3);
	this.m_attributes=c_ArrayList4.m_new.call(new c_ArrayList4);
	this.m_pi=false;
	this.m_cdata=false;
	this.m_value="";
}
c_XMLElement.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_XMLElement.m_new2=function(t_name,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<630>";
	dbg_object(this).m_parent=t_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<631>";
	dbg_object(this).m_name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<632>";
	if(t_parent!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<632>";
		dbg_object(t_parent).m_children.p_Add(this);
	}
	pop_err();
	return this;
}
c_XMLElement.prototype.p_SetAttribute=function(t_name,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<675>";
	if(!((t_name).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<675>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"XMLElement.SetAttribute: name must not be empty",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<676>";
	for(var t_i=0;t_i<this.m_attributes.p_Size();t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<677>";
		var t_att=this.m_attributes.p_Get2(t_i);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<678>";
		if(dbg_object(t_att).m_name==t_name){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<679>";
			var t_old=dbg_object(t_att).m_value;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<680>";
			dbg_object(t_att).m_value=t_value;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<681>";
			pop_err();
			return t_old;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<684>";
	this.m_attributes.p_Add2(c_XMLAttribute.m_new.call(new c_XMLAttribute,t_name,t_value));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<685>";
	pop_err();
	return "";
}
c_XMLElement.prototype.p_AddChild=function(t_child){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<650>";
	if(this.m_children.p_Contains2(t_child)){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<651>";
	this.m_children.p_Add(t_child);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<652>";
	dbg_object(t_child).m_parent=this;
	pop_err();
}
c_XMLElement.prototype.p_GetAttribute=function(t_name,t_defaultValue){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<665>";
	if(!((t_name).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<665>";
		pop_err();
		return "";
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<666>";
	for(var t_i=0;t_i<this.m_attributes.p_Size();t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<667>";
		var t_att=this.m_attributes.p_Get2(t_i);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<668>";
		if(dbg_object(t_att).m_name==t_name){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<668>";
			pop_err();
			return dbg_object(t_att).m_value;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<670>";
	pop_err();
	return t_defaultValue;
}
c_XMLElement.prototype.p_MatchesAttribute=function(t_check){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<806>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<806>";
	var t_=this.m_attributes.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<806>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<806>";
		var t_attr=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<807>";
		if(t_attr.p_Matches(t_check)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<807>";
			pop_err();
			return true;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<809>";
	pop_err();
	return false;
}
c_XMLElement.prototype.p_GetChildrenByName=function(t_findName,t_att1,t_att2,t_att3,t_att4,t_att5,t_att6,t_att7,t_att8,t_att9,t_att10){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<765>";
	if(!((t_findName).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<765>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"XMLElement.GetChildrenByName: findName must not be empty",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<766>";
	var t_rv=c_ArrayList3.m_new.call(new c_ArrayList3);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<767>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<767>";
	var t_=this.m_children.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<767>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<767>";
		var t_element=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<768>";
		if(dbg_object(t_element).m_name==t_findName){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<769>";
			if(((t_att1).length!=0) && !t_element.p_MatchesAttribute(t_att1)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<769>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<770>";
			if(((t_att2).length!=0) && !t_element.p_MatchesAttribute(t_att2)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<770>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<771>";
			if(((t_att3).length!=0) && !t_element.p_MatchesAttribute(t_att3)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<771>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<772>";
			if(((t_att4).length!=0) && !t_element.p_MatchesAttribute(t_att4)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<772>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<773>";
			if(((t_att5).length!=0) && !t_element.p_MatchesAttribute(t_att5)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<773>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<774>";
			if(((t_att6).length!=0) && !t_element.p_MatchesAttribute(t_att6)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<774>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<775>";
			if(((t_att7).length!=0) && !t_element.p_MatchesAttribute(t_att7)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<775>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<776>";
			if(((t_att8).length!=0) && !t_element.p_MatchesAttribute(t_att8)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<776>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<777>";
			if(((t_att9).length!=0) && !t_element.p_MatchesAttribute(t_att9)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<777>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<778>";
			if(((t_att10).length!=0) && !t_element.p_MatchesAttribute(t_att10)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<778>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<779>";
			t_rv.p_Add(t_element);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<782>";
	pop_err();
	return t_rv;
}
c_XMLElement.prototype.p_Children=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<814>";
	pop_err();
	return this.m_children;
}
c_XMLElement.prototype.p_Name=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<822>";
	pop_err();
	return this.m_name;
}
c_XMLElement.prototype.p_Name2=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<826>";
	if(!((t_name).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<826>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"XMLElement.Name: name must not be empty",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<827>";
	dbg_object(this).m_name=t_name;
	pop_err();
}
c_XMLElement.prototype.p_HasAttribute=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<656>";
	if(!((t_name).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<656>";
		pop_err();
		return false;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<657>";
	for(var t_i=0;t_i<this.m_attributes.p_Size();t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<658>";
		var t_att=this.m_attributes.p_Get2(t_i);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<659>";
		if(dbg_object(t_att).m_name==t_name){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<659>";
			pop_err();
			return true;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<661>";
	pop_err();
	return false;
}
c_XMLElement.prototype.p_Value=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<831>";
	pop_err();
	return this.m_value;
}
c_XMLElement.prototype.p_Value2=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<835>";
	dbg_object(this).m_value=t_value;
	pop_err();
}
function c_ICollection3(){
	Object.call(this);
}
c_ICollection3.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>";
	pop_err();
	return this;
}
c_ICollection3.prototype.p_ToArray=function(){
}
c_ICollection3.prototype.p_Add=function(t_o){
}
c_ICollection3.prototype.p_Contains2=function(t_o){
}
c_ICollection3.prototype.p_IsEmpty=function(){
}
c_ICollection3.prototype.p_Size=function(){
}
c_ICollection3.prototype.p_Enumerator=function(){
}
c_ICollection3.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.p_Enumerator();
	pop_err();
	return t_;
}
function c_IList3(){
	c_ICollection3.call(this);
	this.m_modCount=0;
}
c_IList3.prototype=extend_class(c_ICollection3);
c_IList3.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	c_ICollection3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	pop_err();
	return this;
}
c_IList3.prototype.p_RemoveLast=function(){
}
c_IList3.prototype.p_RemoveAt=function(t_index){
}
c_IList3.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.p_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
c_IList3.prototype.p_AddLast=function(t_o){
}
c_IList3.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(c_ListEnumerator3.m_new.call(new c_ListEnumerator3,this));
	pop_err();
	return t_;
}
c_IList3.prototype.p_Get2=function(t_index){
}
function c_ArrayList3(){
	c_IList3.call(this);
	this.m_elements=[];
	this.m_size=0;
}
c_ArrayList3.prototype=extend_class(c_IList3);
c_ArrayList3.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>";
	c_IList3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>";
	dbg_object(this).m_elements=new_object_array(10);
	pop_err();
	return this;
}
c_ArrayList3.m_new2=function(t_initialCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>";
	c_IList3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
	if(t_initialCapacity<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Capacity must be >= 0",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>";
	dbg_object(this).m_elements=new_object_array(t_initialCapacity);
	pop_err();
	return this;
}
c_ArrayList3.m_new3=function(t_c){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>";
	c_IList3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
	if(!((t_c)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Source collection must not be null",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>";
	this.m_elements=t_c.p_ToArray();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>";
	this.m_size=this.m_elements.length;
	pop_err();
	return this;
}
c_ArrayList3.prototype.p_EnsureCapacity=function(t_minCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>";
	var t_oldCapacity=this.m_elements.length;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>";
	if(t_minCapacity>t_oldCapacity){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>";
		var t_newCapacity=((t_oldCapacity*3/2)|0)+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
		if(t_newCapacity<t_minCapacity){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
			t_newCapacity=t_minCapacity;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>";
		this.m_elements=resize_object_array(this.m_elements,t_newCapacity);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>";
		this.m_modCount+=1;
	}
	pop_err();
}
c_ArrayList3.prototype.p_Add=function(t_o){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
	if(this.m_size+1>this.m_elements.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
		this.p_EnsureCapacity(this.m_size+1);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>";
	dbg_array(this.m_elements,this.m_size)[dbg_index]=(t_o)
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>";
	this.m_size+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>";
	this.m_modCount+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>";
	pop_err();
	return true;
}
c_ArrayList3.prototype.p_Contains2=function(t_o){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<397>";
	for(var t_i=0;t_i<this.m_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<398>";
		if(dbg_array(this.m_elements,t_i)[dbg_index]==(t_o)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<398>";
			pop_err();
			return true;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<400>";
	pop_err();
	return false;
}
c_ArrayList3.prototype.p_IsEmpty=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<431>";
	var t_=this.m_size==0;
	pop_err();
	return t_;
}
c_ArrayList3.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.m_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.m_size),null);
	}
	pop_err();
}
c_ArrayList3.prototype.p_RemoveAt=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<586>";
	this.p_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<587>";
	var t_oldValue=object_downcast((dbg_array(this.m_elements,t_index)[dbg_index]),c_XMLElement);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<588>";
	for(var t_i=t_index;t_i<this.m_size-1;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<589>";
		dbg_array(this.m_elements,t_i)[dbg_index]=dbg_array(this.m_elements,t_i+1)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<591>";
	dbg_array(this.m_elements,this.m_size-1)[dbg_index]=null
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<592>";
	this.m_size-=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<593>";
	this.m_modCount+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<594>";
	pop_err();
	return t_oldValue;
}
c_ArrayList3.prototype.p_RemoveLast=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<508>";
	var t_=this.p_RemoveAt(this.m_size-1);
	pop_err();
	return t_;
}
c_ArrayList3.prototype.p_AddLast=function(t_o){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<503>";
	var t_=this.p_Add(t_o);
	pop_err();
	return t_;
}
c_ArrayList3.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(c_ArrayListEnumerator3.m_new.call(new c_ArrayListEnumerator3,this));
	pop_err();
	return t_;
}
c_ArrayList3.prototype.p_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.m_size;
}
c_ArrayList3.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>";
	var t_arr=new_object_array(this.m_size);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>";
	for(var t_i=0;t_i<this.m_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>";
		dbg_array(t_arr,t_i)[dbg_index]=dbg_array(this.m_elements,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>";
	pop_err();
	return t_arr;
}
c_ArrayList3.prototype.p_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.p_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.m_elements,t_index)[dbg_index]),c_XMLElement);
	pop_err();
	return t_;
}
function bb_xml_UnescapeXMLString(t_str){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<864>";
	if(!((t_str).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<864>";
		pop_err();
		return "";
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<865>";
	t_str=string_replace(t_str,"&quot;","\"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<866>";
	t_str=string_replace(t_str,"&apos;","'");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<867>";
	t_str=string_replace(t_str,"&gt;",">");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<868>";
	t_str=string_replace(t_str,"&lt;","<");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<869>";
	t_str=string_replace(t_str,"&amp;","&");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<870>";
	pop_err();
	return t_str;
}
function c_XMLAttribute(){
	Object.call(this);
	this.m_name="";
	this.m_value="";
}
c_XMLAttribute.m_new=function(t_name,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<597>";
	dbg_object(this).m_name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<598>";
	dbg_object(this).m_value=t_value;
	pop_err();
	return this;
}
c_XMLAttribute.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<590>";
	pop_err();
	return this;
}
c_XMLAttribute.prototype.p_Matches=function(t_check){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<602>";
	var t_=t_check==this.m_name+"="+this.m_value;
	pop_err();
	return t_;
}
function c_ICollection4(){
	Object.call(this);
}
c_ICollection4.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>";
	pop_err();
	return this;
}
c_ICollection4.prototype.p_ToArray=function(){
}
c_ICollection4.prototype.p_Size=function(){
}
c_ICollection4.prototype.p_Add2=function(t_o){
}
c_ICollection4.prototype.p_Enumerator=function(){
}
c_ICollection4.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.p_Enumerator();
	pop_err();
	return t_;
}
function c_IList4(){
	c_ICollection4.call(this);
	this.m_modCount=0;
}
c_IList4.prototype=extend_class(c_ICollection4);
c_IList4.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	c_ICollection4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	pop_err();
	return this;
}
c_IList4.prototype.p_Get2=function(t_index){
}
c_IList4.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.p_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
c_IList4.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(c_ListEnumerator4.m_new.call(new c_ListEnumerator4,this));
	pop_err();
	return t_;
}
function c_ArrayList4(){
	c_IList4.call(this);
	this.m_elements=[];
	this.m_size=0;
}
c_ArrayList4.prototype=extend_class(c_IList4);
c_ArrayList4.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>";
	c_IList4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>";
	dbg_object(this).m_elements=new_object_array(10);
	pop_err();
	return this;
}
c_ArrayList4.m_new2=function(t_initialCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>";
	c_IList4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
	if(t_initialCapacity<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Capacity must be >= 0",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>";
	dbg_object(this).m_elements=new_object_array(t_initialCapacity);
	pop_err();
	return this;
}
c_ArrayList4.m_new3=function(t_c){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>";
	c_IList4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
	if(!((t_c)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Source collection must not be null",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>";
	this.m_elements=t_c.p_ToArray();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>";
	this.m_size=this.m_elements.length;
	pop_err();
	return this;
}
c_ArrayList4.prototype.p_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.m_size;
}
c_ArrayList4.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.m_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.m_size),null);
	}
	pop_err();
}
c_ArrayList4.prototype.p_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.p_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.m_elements,t_index)[dbg_index]),c_XMLAttribute);
	pop_err();
	return t_;
}
c_ArrayList4.prototype.p_EnsureCapacity=function(t_minCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>";
	var t_oldCapacity=this.m_elements.length;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>";
	if(t_minCapacity>t_oldCapacity){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>";
		var t_newCapacity=((t_oldCapacity*3/2)|0)+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
		if(t_newCapacity<t_minCapacity){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
			t_newCapacity=t_minCapacity;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>";
		this.m_elements=resize_object_array(this.m_elements,t_newCapacity);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>";
		this.m_modCount+=1;
	}
	pop_err();
}
c_ArrayList4.prototype.p_Add2=function(t_o){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
	if(this.m_size+1>this.m_elements.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
		this.p_EnsureCapacity(this.m_size+1);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>";
	dbg_array(this.m_elements,this.m_size)[dbg_index]=(t_o)
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>";
	this.m_size+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>";
	this.m_modCount+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>";
	pop_err();
	return true;
}
c_ArrayList4.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(c_ArrayListEnumerator4.m_new.call(new c_ArrayListEnumerator4,this));
	pop_err();
	return t_;
}
c_ArrayList4.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>";
	var t_arr=new_object_array(this.m_size);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>";
	for(var t_i=0;t_i<this.m_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>";
		dbg_array(t_arr,t_i)[dbg_index]=dbg_array(this.m_elements,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>";
	pop_err();
	return t_arr;
}
function c_IEnumerator3(){
	Object.call(this);
}
c_IEnumerator3.prototype.p_HasNext=function(){
}
c_IEnumerator3.prototype.p_NextObject=function(){
}
c_IEnumerator3.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
function c_IEnumerator4(){
	Object.call(this);
}
c_IEnumerator4.prototype.p_HasNext=function(){
}
c_IEnumerator4.prototype.p_NextObject=function(){
}
c_IEnumerator4.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
function c_JsonValue(){
	Object.call(this);
}
c_JsonValue.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<14>";
	pop_err();
	return this;
}
c_JsonValue.prototype.p_StringValue=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<29>";
	bb_json_ThrowError();
	pop_err();
	return "";
}
c_JsonValue.prototype.p_IntValue=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<21>";
	bb_json_ThrowError();
	pop_err();
	return 0;
}
function c_JsonObject(){
	c_JsonValue.call(this);
	this.m__data=null;
}
c_JsonObject.prototype=extend_class(c_JsonValue);
c_JsonObject.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<46>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<47>";
	this.m__data=c_StringMap5.m_new.call(new c_StringMap5);
	pop_err();
	return this;
}
c_JsonObject.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<54>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<55>";
	this.m__data=t_data;
	pop_err();
	return this;
}
c_JsonObject.m_new3=function(t_json){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<50>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<51>";
	this.m__data=(c_JsonParser.m_new.call(new c_JsonParser,t_json)).p_ParseObject();
	pop_err();
	return this;
}
c_JsonObject.prototype.p_Get3=function(t_key,t_defval){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<83>";
	if(!this.m__data.p_Contains(t_key)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<83>";
		pop_err();
		return t_defval;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<84>";
	var t_val=this.m__data.p_Get(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<85>";
	if((t_val)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<85>";
		pop_err();
		return t_val;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<86>";
	var t_=(c_JsonNull.m_Instance());
	pop_err();
	return t_;
}
c_JsonObject.prototype.p_GetData=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<110>";
	pop_err();
	return this.m__data;
}
c_JsonObject.prototype.p_GetInt=function(t_key,t_defval){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<95>";
	if(!this.m__data.p_Contains(t_key)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<95>";
		pop_err();
		return t_defval;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<96>";
	var t_=this.p_Get3(t_key,null).p_IntValue();
	pop_err();
	return t_;
}
function c_Map5(){
	Object.call(this);
	this.m_root=null;
}
c_Map5.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
c_Map5.prototype.p_Compare=function(t_lhs,t_rhs){
}
c_Map5.prototype.p_RotateLeft4=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>";
	var t_child=dbg_object(t_node).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>";
	dbg_object(t_node).m_right=dbg_object(t_child).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>";
	if((dbg_object(t_child).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>";
		dbg_object(dbg_object(t_child).m_left).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>";
	dbg_object(t_child).m_left=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map5.prototype.p_RotateRight4=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>";
	var t_child=dbg_object(t_node).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>";
	dbg_object(t_node).m_left=dbg_object(t_child).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>";
	if((dbg_object(t_child).m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>";
		dbg_object(dbg_object(t_child).m_right).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>";
	dbg_object(t_child).m_right=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map5.prototype.p_InsertFixup4=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>";
	while(((dbg_object(t_node).m_parent)!=null) && dbg_object(dbg_object(t_node).m_parent).m_color==-1 && ((dbg_object(dbg_object(t_node).m_parent).m_parent)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>";
		if(dbg_object(t_node).m_parent==dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>";
			var t_uncle=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_right;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>";
			if(((t_uncle)!=null) && dbg_object(t_uncle).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>";
				dbg_object(t_uncle).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>";
				dbg_object(dbg_object(t_uncle).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>";
				t_node=dbg_object(t_uncle).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>";
					this.p_RotateLeft4(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>";
				this.p_RotateRight4(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>";
			var t_uncle2=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>";
			if(((t_uncle2)!=null) && dbg_object(t_uncle2).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>";
				dbg_object(t_uncle2).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>";
				dbg_object(dbg_object(t_uncle2).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>";
				t_node=dbg_object(t_uncle2).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>";
					this.p_RotateRight4(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>";
				this.p_RotateLeft4(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>";
	dbg_object(this.m_root).m_color=1;
	pop_err();
	return 0;
}
c_Map5.prototype.p_Set4=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_parent=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_cmp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>";
		t_parent=t_node;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>";
		t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>";
				dbg_object(t_node).m_value=t_value;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>";
				pop_err();
				return false;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>";
	t_node=c_Node5.m_new.call(new c_Node5,t_key,t_value,-1,t_parent);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>";
	if((t_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>";
			dbg_object(t_parent).m_right=t_node;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>";
			dbg_object(t_parent).m_left=t_node;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>";
		this.p_InsertFixup4(t_node);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>";
		this.m_root=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>";
	pop_err();
	return true;
}
c_Map5.prototype.p_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>";
				pop_err();
				return t_node;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>";
	pop_err();
	return t_node;
}
c_Map5.prototype.p_Contains=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>";
	var t_=this.p_FindNode(t_key)!=null;
	pop_err();
	return t_;
}
c_Map5.prototype.p_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.p_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).m_value;
	}
	pop_err();
	return null;
}
c_Map5.prototype.p_FirstNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
	if(!((this.m_root)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>";
	while((dbg_object(t_node).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>";
		t_node=dbg_object(t_node).m_left;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>";
	pop_err();
	return t_node;
}
c_Map5.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<121>";
	var t_=c_NodeEnumerator.m_new.call(new c_NodeEnumerator,this.p_FirstNode());
	pop_err();
	return t_;
}
function c_StringMap5(){
	c_Map5.call(this);
}
c_StringMap5.prototype=extend_class(c_Map5);
c_StringMap5.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	c_Map5.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
c_StringMap5.prototype.p_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function c_JsonParser(){
	Object.call(this);
	this.m__text="";
	this.m__pos=0;
	this.m__toke="";
	this.m__type=0;
}
c_JsonParser.prototype.p_GetChar=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<345>";
	if(this.m__pos==this.m__text.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<345>";
		bb_json_ThrowError();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<346>";
	this.m__pos+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<347>";
	var t_=dbg_charCodeAt(this.m__text,this.m__pos-1);
	pop_err();
	return t_;
}
c_JsonParser.prototype.p_CParseDigits=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<367>";
	var t_p=this.m__pos;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<368>";
	while(this.m__pos<this.m__text.length && dbg_charCodeAt(this.m__text,this.m__pos)>=48 && dbg_charCodeAt(this.m__text,this.m__pos)<=57){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<369>";
		this.m__pos+=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<371>";
	var t_=this.m__pos>t_p;
	pop_err();
	return t_;
}
c_JsonParser.prototype.p_CParseChar=function(t_chr){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<361>";
	if(this.m__pos>=this.m__text.length || dbg_charCodeAt(this.m__text,this.m__pos)!=t_chr){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<361>";
		pop_err();
		return false;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<362>";
	this.m__pos+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<363>";
	pop_err();
	return true;
}
c_JsonParser.prototype.p_PeekChar=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<351>";
	if(this.m__pos==this.m__text.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<351>";
		pop_err();
		return 0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<352>";
	pop_err();
	return dbg_charCodeAt(this.m__text,this.m__pos);
}
c_JsonParser.prototype.p_Bump=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<376>";
	while(this.m__pos<this.m__text.length && dbg_charCodeAt(this.m__text,this.m__pos)<=32){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<377>";
		this.m__pos+=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<380>";
	if(this.m__pos==this.m__text.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<381>";
		this.m__toke="";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<382>";
		this.m__type=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<383>";
		pop_err();
		return this.m__toke;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<386>";
	var t_pos=this.m__pos;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<387>";
	var t_chr=this.p_GetChar();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<389>";
	if(t_chr==34){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<390>";
		do{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<391>";
			var t_chr2=this.p_GetChar();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<392>";
			if(t_chr2==34){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<392>";
				break;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<393>";
			if(t_chr2==92){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<393>";
				this.p_GetChar();
			}
		}while(!(false));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<395>";
		this.m__type=1;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<396>";
		if(t_chr==45 || t_chr>=48 && t_chr<=57){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<397>";
			if(t_chr==45){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<398>";
				t_chr=this.p_GetChar();
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<399>";
				if(t_chr<48 || t_chr>57){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<399>";
					bb_json_ThrowError();
				}
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<401>";
			if(t_chr!=48){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<402>";
				this.p_CParseDigits();
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<404>";
			if(this.p_CParseChar(46)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<405>";
				this.p_CParseDigits();
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<407>";
			if(this.p_CParseChar(69) || this.p_CParseChar(101)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<408>";
				if(this.p_PeekChar()==43 || this.p_PeekChar()==45){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<408>";
					this.p_GetChar();
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<409>";
				if(!this.p_CParseDigits()){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<409>";
					bb_json_ThrowError();
				}
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<411>";
			this.m__type=2;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<412>";
			if(t_chr>=65 && t_chr<91 || t_chr>=97 && t_chr<123){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<413>";
				t_chr=this.p_PeekChar();
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<414>";
				while(t_chr>=65 && t_chr<91 || t_chr>=97 && t_chr<123){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<415>";
					this.p_GetChar();
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<416>";
					t_chr=this.p_PeekChar();
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<418>";
				this.m__type=4;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<420>";
				this.m__type=3;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<422>";
	this.m__toke=this.m__text.slice(t_pos,this.m__pos);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<423>";
	pop_err();
	return this.m__toke;
}
c_JsonParser.m_new=function(t_json){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<316>";
	this.m__text=t_json;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<317>";
	this.p_Bump();
	pop_err();
	return this;
}
c_JsonParser.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<313>";
	pop_err();
	return this;
}
c_JsonParser.prototype.p_CParse=function(t_toke){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<435>";
	if(t_toke!=this.m__toke){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<435>";
		pop_err();
		return false;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<436>";
	this.p_Bump();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<437>";
	pop_err();
	return true;
}
c_JsonParser.prototype.p_Parse=function(t_toke){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<441>";
	if(!this.p_CParse(t_toke)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<441>";
		bb_json_ThrowError();
	}
	pop_err();
}
c_JsonParser.prototype.p_TokeType=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<431>";
	pop_err();
	return this.m__type;
}
c_JsonParser.prototype.p_Toke=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<427>";
	pop_err();
	return this.m__toke;
}
c_JsonParser.prototype.p_ParseString2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<471>";
	if(this.p_TokeType()!=1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<471>";
		bb_json_ThrowError();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<472>";
	var t_toke=this.p_Toke().slice(1,-1);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<473>";
	var t_i=t_toke.indexOf("\\",0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<474>";
	if(t_i!=-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<475>";
		var t_frags=c_StringStack.m_new2.call(new c_StringStack);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<475>";
		var t_p=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<475>";
		var t_esc="";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<476>";
		do{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<477>";
			if(t_i+1>=t_toke.length){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<477>";
				bb_json_ThrowError();
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<478>";
			t_frags.p_Push16(t_toke.slice(t_p,t_i));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<479>";
			var t_1=dbg_charCodeAt(t_toke,t_i+1);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<480>";
			if(t_1==34){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<480>";
				t_esc="\"";
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<481>";
				if(t_1==92){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<481>";
					t_esc="\\";
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<482>";
					if(t_1==47){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<482>";
						t_esc="/";
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<483>";
						if(t_1==98){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<483>";
							t_esc=String.fromCharCode(8);
						}else{
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<484>";
							if(t_1==102){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<484>";
								t_esc=String.fromCharCode(12);
							}else{
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<485>";
								if(t_1==114){
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<485>";
									t_esc=String.fromCharCode(13);
								}else{
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<486>";
									if(t_1==110){
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<486>";
										t_esc=String.fromCharCode(10);
									}else{
										err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<487>";
										if(t_1==117){
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<488>";
											if(t_i+6>t_toke.length){
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<488>";
												bb_json_ThrowError();
											}
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<489>";
											var t_val=0;
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<490>";
											for(var t_j=2;t_j<6;t_j=t_j+1){
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<491>";
												var t_chr=dbg_charCodeAt(t_toke,t_i+t_j);
												err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<492>";
												if(t_chr>=48 && t_chr<58){
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<493>";
													t_val=t_val<<4|t_chr-48;
												}else{
													err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<494>";
													if(t_chr>=65 && t_chr<123){
														err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<495>";
														t_chr&=31;
														err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<496>";
														if(t_chr<1 || t_chr>6){
															err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<496>";
															bb_json_ThrowError();
														}
														err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<497>";
														t_val=t_val<<4|t_chr+9;
													}else{
														err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<499>";
														bb_json_ThrowError();
													}
												}
											}
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<502>";
											t_esc=String.fromCharCode(t_val);
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<503>";
											t_i+=4;
										}else{
											err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<505>";
											bb_json_ThrowError();
										}
									}
								}
							}
						}
					}
				}
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<507>";
			t_frags.p_Push16(t_esc);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<508>";
			t_p=t_i+2;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<509>";
			t_i=t_toke.indexOf("\\",t_p);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<510>";
			if(t_i!=-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<510>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<511>";
			t_frags.p_Push16(t_toke.slice(t_p));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<512>";
			break;
		}while(!(false));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<514>";
		t_toke=t_frags.p_Join("");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<516>";
	this.p_Bump();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<517>";
	pop_err();
	return t_toke;
}
c_JsonParser.prototype.p_ParseNumber=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<521>";
	if(this.p_TokeType()!=2){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<521>";
		bb_json_ThrowError();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<522>";
	var t_toke=this.p_Toke();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<523>";
	this.p_Bump();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<524>";
	pop_err();
	return t_toke;
}
c_JsonParser.prototype.p_ParseArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<459>";
	this.p_Parse("[");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<460>";
	if(this.p_CParse("]")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<460>";
		pop_err();
		return [];
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<461>";
	var t_stack=c_Stack7.m_new.call(new c_Stack7);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<462>";
	do{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<463>";
		var t_value=this.p_ParseValue();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<464>";
		t_stack.p_Push19(t_value);
	}while(!(!this.p_CParse(",")));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<466>";
	this.p_Parse("]");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<467>";
	var t_=t_stack.p_ToArray();
	pop_err();
	return t_;
}
c_JsonParser.prototype.p_ParseValue=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<321>";
	if(this.p_TokeType()==1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<321>";
		var t_=(c_JsonString.m_Instance(this.p_ParseString2()));
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<322>";
	if(this.p_TokeType()==2){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<322>";
		var t_2=(c_JsonNumber.m_Instance(this.p_ParseNumber()));
		pop_err();
		return t_2;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<323>";
	if(this.p_Toke()=="{"){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<323>";
		var t_3=(c_JsonObject.m_new2.call(new c_JsonObject,this.p_ParseObject()));
		pop_err();
		return t_3;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<324>";
	if(this.p_Toke()=="["){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<324>";
		var t_4=(c_JsonArray.m_new2.call(new c_JsonArray,this.p_ParseArray()));
		pop_err();
		return t_4;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<325>";
	if(this.p_CParse("true")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<325>";
		var t_5=(c_JsonBool.m_Instance(true));
		pop_err();
		return t_5;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<326>";
	if(this.p_CParse("false")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<326>";
		var t_6=(c_JsonBool.m_Instance(false));
		pop_err();
		return t_6;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<327>";
	if(this.p_CParse("null")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<327>";
		var t_7=(c_JsonNull.m_Instance());
		pop_err();
		return t_7;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<328>";
	bb_json_ThrowError();
	pop_err();
	return null;
}
c_JsonParser.prototype.p_ParseObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<445>";
	this.p_Parse("{");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<446>";
	var t_map=c_StringMap5.m_new.call(new c_StringMap5);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<447>";
	if(this.p_CParse("}")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<447>";
		pop_err();
		return t_map;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<448>";
	do{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<449>";
		var t_name=this.p_ParseString2();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<450>";
		this.p_Parse(":");
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<451>";
		var t_value=this.p_ParseValue();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<452>";
		t_map.p_Set4(t_name,t_value);
	}while(!(!this.p_CParse(",")));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<454>";
	this.p_Parse("}");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<455>";
	pop_err();
	return t_map;
}
function c_JsonError(){
	ThrowableObject.call(this);
}
c_JsonError.prototype=extend_class(ThrowableObject);
c_JsonError.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<11>";
	pop_err();
	return this;
}
function bb_json_ThrowError(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<6>";
	throw c_JsonError.m_new.call(new c_JsonError);
}
function c_Stack6(){
	Object.call(this);
	this.m_data=[];
	this.m_length=0;
}
c_Stack6.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_Stack6.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).m_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).m_length=t_data.length;
	pop_err();
	return this;
}
c_Stack6.prototype.p_Push16=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>";
	if(this.m_length==this.m_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>";
		this.m_data=resize_string_array(this.m_data,this.m_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>";
	dbg_array(this.m_data,this.m_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>";
	this.m_length+=1;
	pop_err();
}
c_Stack6.prototype.p_Push17=function(t_values,t_offset,t_count){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>";
	for(var t_i=0;t_i<t_count;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>";
		this.p_Push16(dbg_array(t_values,t_offset+t_i)[dbg_index]);
	}
	pop_err();
}
c_Stack6.prototype.p_Push18=function(t_values,t_offset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>";
	this.p_Push17(t_values,t_offset,t_values.length-t_offset);
	pop_err();
}
c_Stack6.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_string_array(this.m_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.m_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.m_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function c_StringStack(){
	c_Stack6.call(this);
}
c_StringStack.prototype=extend_class(c_Stack6);
c_StringStack.m_new=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<351>";
	c_Stack6.m_new2.call(this,t_data);
	pop_err();
	return this;
}
c_StringStack.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<348>";
	c_Stack6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<348>";
	pop_err();
	return this;
}
c_StringStack.prototype.p_Join=function(t_separator){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<355>";
	var t_=this.p_ToArray().join(t_separator);
	pop_err();
	return t_;
}
function c_JsonString(){
	c_JsonValue.call(this);
	this.m__value="";
}
c_JsonString.prototype=extend_class(c_JsonValue);
c_JsonString.m_new=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<257>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<258>";
	this.m__value=t_value;
	pop_err();
	return this;
}
c_JsonString.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<255>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<255>";
	pop_err();
	return this;
}
c_JsonString.m__null=null;
c_JsonString.m_Instance=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<270>";
	if((t_value).length!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<270>";
		var t_=c_JsonString.m_new.call(new c_JsonString,t_value);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<271>";
	pop_err();
	return c_JsonString.m__null;
}
c_JsonString.prototype.p_StringValue=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<262>";
	pop_err();
	return this.m__value;
}
function c_JsonNumber(){
	c_JsonValue.call(this);
	this.m__value="";
}
c_JsonNumber.prototype=extend_class(c_JsonValue);
c_JsonNumber.m_new=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<284>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<286>";
	this.m__value=t_value;
	pop_err();
	return this;
}
c_JsonNumber.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<282>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<282>";
	pop_err();
	return this;
}
c_JsonNumber.m__zero=null;
c_JsonNumber.m_Instance=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<302>";
	if(t_value!="0"){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<302>";
		var t_=c_JsonNumber.m_new.call(new c_JsonNumber,t_value);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<303>";
	pop_err();
	return c_JsonNumber.m__zero;
}
c_JsonNumber.prototype.p_IntValue=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<290>";
	var t_=parseInt((this.m__value),10);
	pop_err();
	return t_;
}
function c_JsonArray(){
	c_JsonValue.call(this);
	this.m__data=[];
}
c_JsonArray.prototype=extend_class(c_JsonValue);
c_JsonArray.m_new=function(t_length){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<133>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<134>";
	this.m__data=new_object_array(t_length);
	pop_err();
	return this;
}
c_JsonArray.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<137>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<138>";
	this.m__data=t_data;
	pop_err();
	return this;
}
c_JsonArray.m_new3=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<131>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<131>";
	pop_err();
	return this;
}
function c_Stack7(){
	Object.call(this);
	this.m_data=[];
	this.m_length=0;
}
c_Stack7.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_Stack7.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).m_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).m_length=t_data.length;
	pop_err();
	return this;
}
c_Stack7.prototype.p_Push19=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>";
	if(this.m_length==this.m_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>";
		this.m_data=resize_object_array(this.m_data,this.m_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>";
	dbg_array(this.m_data,this.m_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>";
	this.m_length+=1;
	pop_err();
}
c_Stack7.prototype.p_Push20=function(t_values,t_offset,t_count){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>";
	for(var t_i=0;t_i<t_count;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>";
		this.p_Push19(dbg_array(t_values,t_offset+t_i)[dbg_index]);
	}
	pop_err();
}
c_Stack7.prototype.p_Push21=function(t_values,t_offset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>";
	this.p_Push20(t_values,t_offset,t_values.length-t_offset);
	pop_err();
}
c_Stack7.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.m_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.m_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.m_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function c_JsonBool(){
	c_JsonValue.call(this);
	this.m__value=false;
}
c_JsonBool.prototype=extend_class(c_JsonValue);
c_JsonBool.m_new=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<228>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<229>";
	this.m__value=t_value;
	pop_err();
	return this;
}
c_JsonBool.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<226>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<226>";
	pop_err();
	return this;
}
c_JsonBool.m__true=null;
c_JsonBool.m__false=null;
c_JsonBool.m_Instance=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<242>";
	if(t_value){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<242>";
		pop_err();
		return c_JsonBool.m__true;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<243>";
	pop_err();
	return c_JsonBool.m__false;
}
function c_JsonNull(){
	c_JsonValue.call(this);
}
c_JsonNull.prototype=extend_class(c_JsonValue);
c_JsonNull.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<210>";
	c_JsonValue.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<210>";
	pop_err();
	return this;
}
c_JsonNull.m__instance=null;
c_JsonNull.m_Instance=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<217>";
	pop_err();
	return c_JsonNull.m__instance;
}
function c_Node5(){
	Object.call(this);
	this.m_key="";
	this.m_right=null;
	this.m_left=null;
	this.m_value=null;
	this.m_color=0;
	this.m_parent=null;
}
c_Node5.m_new=function(t_key,t_value,t_color,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>";
	dbg_object(this).m_key=t_key;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>";
	dbg_object(this).m_value=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>";
	dbg_object(this).m_color=t_color;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>";
	dbg_object(this).m_parent=t_parent;
	pop_err();
	return this;
}
c_Node5.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>";
	pop_err();
	return this;
}
c_Node5.prototype.p_NextNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>";
	var t_node=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>";
	if((this.m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>";
		t_node=this.m_right;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>";
		while((dbg_object(t_node).m_left)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>";
			t_node=dbg_object(t_node).m_left;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>";
		pop_err();
		return t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>";
	t_node=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>";
	var t_parent=dbg_object(this).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>";
	while(((t_parent)!=null) && t_node==dbg_object(t_parent).m_right){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>";
		t_node=t_parent;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>";
		t_parent=dbg_object(t_parent).m_parent;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>";
	pop_err();
	return t_parent;
}
c_Node5.prototype.p_Key=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<377>";
	pop_err();
	return this.m_key;
}
c_Node5.prototype.p_Value=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<381>";
	pop_err();
	return this.m_value;
}
function c_NodeEnumerator(){
	Object.call(this);
	this.m_node=null;
}
c_NodeEnumerator.m_new=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<437>";
	dbg_object(this).m_node=t_node;
	pop_err();
	return this;
}
c_NodeEnumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<434>";
	pop_err();
	return this;
}
c_NodeEnumerator.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<441>";
	var t_=this.m_node!=null;
	pop_err();
	return t_;
}
c_NodeEnumerator.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<445>";
	var t_t=this.m_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<446>";
	this.m_node=this.m_node.p_NextNode();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<447>";
	pop_err();
	return t_t;
}
function c_TitleScreen(){
	c_Screen.call(this);
}
c_TitleScreen.prototype=extend_class(c_Screen);
c_TitleScreen.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<32>";
	c_Screen.m_new.call(this,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<33>";
	this.m_name="Title";
	pop_err();
	return this;
}
c_TitleScreen.prototype.p_Start=function(){
	push_err();
	pop_err();
}
c_TitleScreen.prototype.p_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<41>";
	bb_graphics_Cls(0.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<42>";
	bb_graphics_DrawText("Bunny Shooter!",bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2,0.5,0.5);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<43>";
	bb_graphics_DrawText("Escape to Quit!",bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2+40.0,0.5,0.5);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<44>";
	bb_graphics_DrawText("Enter to Play!",bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2+80.0,0.5,0.5);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<45>";
	c_FPSCounter.m_Draw(0,0,0.0,0.0);
	pop_err();
}
c_TitleScreen.prototype.p_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<49>";
	if((bb_input_KeyHit(27))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<50>";
		this.p_FadeToScreen(null,bb_framework_defaultFadeTime,false,false,true);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<52>";
	if((bb_input_KeyHit(13))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<53>";
		this.p_FadeToScreen((bb_mainClass_gameScreen),bb_framework_defaultFadeTime,false,false,true);
	}
	pop_err();
}
var bb_mainClass_titleScreen=null;
function c_GameScreen(){
	c_Screen.call(this);
	this.m_tilemap=null;
	this.m_bunny=null;
	this.m_currentTime=0;
	this.m_score=0;
	this.m_gameOver=false;
}
c_GameScreen.prototype=extend_class(c_Screen);
c_GameScreen.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<68>";
	c_Screen.m_new.call(this,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<69>";
	this.m_name="Gameplay";
	pop_err();
	return this;
}
c_GameScreen.prototype.p_Start=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<75>";
	var t_reader=c_MyTiledTileMapReader.m_new.call(new c_MyTiledTileMapReader);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<76>";
	var t_tm=t_reader.p_LoadMap("levels/map.tmx");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<77>";
	this.m_tilemap=object_downcast((t_tm),c_MyTileMap);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<79>";
	this.m_bunny=c_Bunny.m_new.call(new c_Bunny,dbg_object(bb_framework_diddyGame).m_images.p_Find("bunny_bottom"),bb_framework_SCREEN_HEIGHT2,bb_framework_SCREEN_WIDTH2,10);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<80>";
	this.m_currentTime=bb_app_Millisecs();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<81>";
	this.m_score=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<82>";
	this.m_gameOver=false;
	pop_err();
}
c_GameScreen.prototype.p_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<86>";
	if(this.m_gameOver){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<87>";
	this.m_bunny.p_Update2();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<88>";
	bb_bulletClass_UpdateBullets();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<89>";
	if(bb_app_Millisecs()-this.m_currentTime>1000){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<90>";
		bb_hunterClass_CreateHunter();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<91>";
		this.m_currentTime=bb_app_Millisecs();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<101>";
	bb_hunterClass_UpdateHunter((this.m_bunny.p_GetXpos()),(this.m_bunny.p_GetYpos()));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<103>";
	if(this.m_bunny.p_GetHealth()<=0 && this.m_gameOver==false){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<104>";
		this.m_gameOver=true;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<105>";
		this.p_FadeToScreen((bb_mainClass_titleScreen),bb_framework_defaultFadeTime,false,false,true);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<106>";
		bb_bulletClass_RemoveBullets();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<107>";
		bb_hunterClass_RemoveHunter();
	}
	pop_err();
}
c_GameScreen.prototype.p_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<112>";
	bb_graphics_Cls(0.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<113>";
	this.m_tilemap.p_RenderMap(((dbg_object(bb_framework_diddyGame).m_scrollX)|0),((dbg_object(bb_framework_diddyGame).m_scrollY)|0),((bb_framework_SCREEN_WIDTH)|0),((bb_framework_SCREEN_HEIGHT)|0),1.0,1.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<114>";
	this.m_bunny.p_Draw();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<120>";
	bb_hunterClass_RenderHunter();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<121>";
	bb_bulletClass_RenderBullets();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<122>";
	bb_graphics_SetColor(0.0,0.0,255.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<123>";
	bb_graphics_DrawText("Score : "+String(this.m_score),10.0,10.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<124>";
	if(bb_mainClass_Debug){
	}
	pop_err();
}
var bb_mainClass_gameScreen=null;
function bb_functions_ExitApp(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<86>";
	bb_app_EndApp();
	pop_err();
}
function bb_graphics_DrawImageRect(t_image,t_x,t_y,t_srcX,t_srcY,t_srcWidth,t_srcHeight,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<495>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<496>";
	if(t_frame<0 || t_frame>=dbg_object(t_image).m_frames.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<496>";
		error("Invalid image frame");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<497>";
	if(t_srcX<0 || t_srcY<0 || t_srcX+t_srcWidth>dbg_object(t_image).m_width || t_srcY+t_srcHeight>dbg_object(t_image).m_height){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<497>";
		error("Invalid image rectangle");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<500>";
	var t_f=dbg_array(dbg_object(t_image).m_frames,t_frame)[dbg_index];
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<502>";
	bb_graphics_context.p_Validate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<504>";
	bb_graphics_renderDevice.DrawSurface2(dbg_object(t_image).m_surface,-dbg_object(t_image).m_tx+t_x,-dbg_object(t_image).m_ty+t_y,t_srcX+dbg_object(t_f).m_x,t_srcY+dbg_object(t_f).m_y,t_srcWidth,t_srcHeight);
	pop_err();
	return 0;
}
function bb_graphics_DrawImageRect2(t_image,t_x,t_y,t_srcX,t_srcY,t_srcWidth,t_srcHeight,t_rotation,t_scaleX,t_scaleY,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<510>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<511>";
	if(t_frame<0 || t_frame>=dbg_object(t_image).m_frames.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<511>";
		error("Invalid image frame");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<512>";
	if(t_srcX<0 || t_srcY<0 || t_srcX+t_srcWidth>dbg_object(t_image).m_width || t_srcY+t_srcHeight>dbg_object(t_image).m_height){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<512>";
		error("Invalid image rectangle");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<515>";
	var t_f=dbg_array(dbg_object(t_image).m_frames,t_frame)[dbg_index];
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<517>";
	bb_graphics_PushMatrix();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<519>";
	bb_graphics_Translate(t_x,t_y);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<520>";
	bb_graphics_Rotate(t_rotation);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<521>";
	bb_graphics_Scale(t_scaleX,t_scaleY);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<522>";
	bb_graphics_Translate(-dbg_object(t_image).m_tx,-dbg_object(t_image).m_ty);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<524>";
	bb_graphics_context.p_Validate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<526>";
	bb_graphics_renderDevice.DrawSurface2(dbg_object(t_image).m_surface,0.0,0.0,t_srcX+dbg_object(t_f).m_x,t_srcY+dbg_object(t_f).m_y,t_srcWidth,t_srcHeight);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<528>";
	bb_graphics_PopMatrix();
	pop_err();
	return 0;
}
function c_ListEnumerator(){
	c_IEnumerator.call(this);
	this.m_lst=null;
	this.m_expectedModCount=0;
	this.m_index=0;
	this.m_lastIndex=0;
}
c_ListEnumerator.prototype=extend_class(c_IEnumerator);
c_ListEnumerator.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	c_IEnumerator.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).m_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.m_expectedModCount=dbg_object(t_lst).m_modCount;
	pop_err();
	return this;
}
c_ListEnumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	c_IEnumerator.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
c_ListEnumerator.prototype.p_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.m_lst).m_modCount!=this.m_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw c_ConcurrentModificationException.m_new.call(new c_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
c_ListEnumerator.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.m_index<this.m_lst.p_Size();
	pop_err();
	return t_;
}
c_ListEnumerator.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.m_lst.p_Get2(this.m_lastIndex);
	pop_err();
	return t_;
}
function c_ArrayListEnumerator(){
	c_ListEnumerator.call(this);
	this.m_alst=null;
}
c_ArrayListEnumerator.prototype=extend_class(c_ListEnumerator);
c_ArrayListEnumerator.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	c_ListEnumerator.m_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).m_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.m_expectedModCount=dbg_object(this.m_alst).m_modCount;
	pop_err();
	return this;
}
c_ArrayListEnumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	c_ListEnumerator.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
c_ArrayListEnumerator.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.m_index<dbg_object(this.m_alst).m_size;
	pop_err();
	return t_;
}
c_ArrayListEnumerator.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.m_alst).m_elements,this.m_lastIndex)[dbg_index]),c_DiddyDataLayer);
	pop_err();
	return t_;
}
function c_ListEnumerator2(){
	c_IEnumerator2.call(this);
	this.m_lst=null;
	this.m_expectedModCount=0;
	this.m_index=0;
	this.m_lastIndex=0;
}
c_ListEnumerator2.prototype=extend_class(c_IEnumerator2);
c_ListEnumerator2.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	c_IEnumerator2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).m_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.m_expectedModCount=dbg_object(t_lst).m_modCount;
	pop_err();
	return this;
}
c_ListEnumerator2.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	c_IEnumerator2.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
c_ListEnumerator2.prototype.p_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.m_lst).m_modCount!=this.m_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw c_ConcurrentModificationException.m_new.call(new c_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
c_ListEnumerator2.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.m_index<this.m_lst.p_Size();
	pop_err();
	return t_;
}
c_ListEnumerator2.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.m_lst.p_Get2(this.m_lastIndex);
	pop_err();
	return t_;
}
function c_ArrayListEnumerator2(){
	c_ListEnumerator2.call(this);
	this.m_alst=null;
}
c_ArrayListEnumerator2.prototype=extend_class(c_ListEnumerator2);
c_ArrayListEnumerator2.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	c_ListEnumerator2.m_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).m_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.m_expectedModCount=dbg_object(this.m_alst).m_modCount;
	pop_err();
	return this;
}
c_ArrayListEnumerator2.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	c_ListEnumerator2.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
c_ArrayListEnumerator2.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.m_index<dbg_object(this.m_alst).m_size;
	pop_err();
	return t_;
}
c_ArrayListEnumerator2.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.m_alst).m_elements,this.m_lastIndex)[dbg_index]),c_DiddyDataObject);
	pop_err();
	return t_;
}
function c_ListEnumerator3(){
	c_IEnumerator3.call(this);
	this.m_lst=null;
	this.m_expectedModCount=0;
	this.m_index=0;
	this.m_lastIndex=0;
}
c_ListEnumerator3.prototype=extend_class(c_IEnumerator3);
c_ListEnumerator3.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	c_IEnumerator3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).m_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.m_expectedModCount=dbg_object(t_lst).m_modCount;
	pop_err();
	return this;
}
c_ListEnumerator3.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	c_IEnumerator3.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
c_ListEnumerator3.prototype.p_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.m_lst).m_modCount!=this.m_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw c_ConcurrentModificationException.m_new.call(new c_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
c_ListEnumerator3.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.m_index<this.m_lst.p_Size();
	pop_err();
	return t_;
}
c_ListEnumerator3.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.m_lst.p_Get2(this.m_lastIndex);
	pop_err();
	return t_;
}
function c_ArrayListEnumerator3(){
	c_ListEnumerator3.call(this);
	this.m_alst=null;
}
c_ArrayListEnumerator3.prototype=extend_class(c_ListEnumerator3);
c_ArrayListEnumerator3.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	c_ListEnumerator3.m_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).m_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.m_expectedModCount=dbg_object(this.m_alst).m_modCount;
	pop_err();
	return this;
}
c_ArrayListEnumerator3.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	c_ListEnumerator3.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
c_ArrayListEnumerator3.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.m_index<dbg_object(this.m_alst).m_size;
	pop_err();
	return t_;
}
c_ArrayListEnumerator3.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.m_alst).m_elements,this.m_lastIndex)[dbg_index]),c_XMLElement);
	pop_err();
	return t_;
}
function c_ListEnumerator4(){
	c_IEnumerator4.call(this);
	this.m_lst=null;
	this.m_expectedModCount=0;
	this.m_index=0;
	this.m_lastIndex=0;
}
c_ListEnumerator4.prototype=extend_class(c_IEnumerator4);
c_ListEnumerator4.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	c_IEnumerator4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).m_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.m_expectedModCount=dbg_object(t_lst).m_modCount;
	pop_err();
	return this;
}
c_ListEnumerator4.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	c_IEnumerator4.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
c_ListEnumerator4.prototype.p_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.m_lst).m_modCount!=this.m_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw c_ConcurrentModificationException.m_new.call(new c_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
c_ListEnumerator4.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.m_index<this.m_lst.p_Size();
	pop_err();
	return t_;
}
c_ListEnumerator4.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.m_lst.p_Get2(this.m_lastIndex);
	pop_err();
	return t_;
}
function c_ArrayListEnumerator4(){
	c_ListEnumerator4.call(this);
	this.m_alst=null;
}
c_ArrayListEnumerator4.prototype=extend_class(c_ListEnumerator4);
c_ArrayListEnumerator4.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	c_ListEnumerator4.m_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).m_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.m_expectedModCount=dbg_object(this.m_alst).m_modCount;
	pop_err();
	return this;
}
c_ArrayListEnumerator4.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	c_ListEnumerator4.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
c_ArrayListEnumerator4.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.m_index<dbg_object(this.m_alst).m_size;
	pop_err();
	return t_;
}
c_ArrayListEnumerator4.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.m_alst).m_elements,this.m_lastIndex)[dbg_index]),c_XMLAttribute);
	pop_err();
	return t_;
}
function c_TileMapReader(){
	Object.call(this);
	this.m_tileMap=null;
	this.m_graphicsPath="";
}
c_TileMapReader.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<40>";
	pop_err();
	return this;
}
c_TileMapReader.prototype.p_LoadMap=function(t_filename){
}
c_TileMapReader.prototype.p_CreateMap=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<48>";
	var t_=c_TileMap.m_new.call(new c_TileMap);
	pop_err();
	return t_;
}
function c_TiledTileMapReader(){
	c_TileMapReader.call(this);
	this.m_doc=null;
}
c_TiledTileMapReader.prototype=extend_class(c_TileMapReader);
c_TiledTileMapReader.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<56>";
	c_TileMapReader.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<56>";
	pop_err();
	return this;
}
c_TiledTileMapReader.prototype.p_ReadProperty=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<145>";
	var t_=c_TileMapProperty.m_new.call(new c_TileMapProperty,t_node.p_GetAttribute("name","default"),t_node.p_GetAttribute("value",""));
	pop_err();
	return t_;
}
c_TiledTileMapReader.prototype.p_ReadProperties=function(t_node,t_obj){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<128>";
	var t_cont=object_downcast((t_obj),c_TileMapPropertyContainer);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<129>";
	if(t_cont!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<130>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<130>";
		var t_=t_node.p_Children().p_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<130>";
		while(t_.p_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<130>";
			var t_propNode=t_.p_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<131>";
			if(t_propNode.p_Name()=="properties"){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<132>";
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<132>";
				var t_2=t_propNode.p_Children().p_ObjectEnumerator();
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<132>";
				while(t_2.p_HasNext()){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<132>";
					var t_child=t_2.p_NextObject();
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<133>";
					if(t_child.p_Name()=="property"){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<134>";
						var t_prop=this.p_ReadProperty(t_child);
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<135>";
						dbg_object(dbg_object(t_cont).m_properties).m_props.p_Set5(dbg_object(t_prop).m_name,t_prop);
					}
				}
				pop_err();
				return;
			}
		}
	}
	pop_err();
}
c_TiledTileMapReader.prototype.p_DoPostLoad=function(t_obj){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<124>";
	if(object_implements((t_obj),"c_ITileMapPostLoad")!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<124>";
		object_implements((t_obj),"c_ITileMapPostLoad").p_PostLoad();
	}
	pop_err();
}
c_TiledTileMapReader.prototype.p_ReadImage=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<226>";
	var t_rv=this.m_tileMap.p_CreateImage();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<227>";
	this.p_ReadProperties(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<229>";
	if(t_node.p_HasAttribute("source")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<229>";
		dbg_object(t_rv).m_source=this.m_graphicsPath+bb_functions_StripDir(t_node.p_GetAttribute("source",""));
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<230>";
	if(t_node.p_HasAttribute("width")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<230>";
		dbg_object(t_rv).m_width=parseInt((t_node.p_GetAttribute("width","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<231>";
	if(t_node.p_HasAttribute("height")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<231>";
		dbg_object(t_rv).m_height=parseInt((t_node.p_GetAttribute("height","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<232>";
	if(t_node.p_HasAttribute("trans")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<232>";
		dbg_object(t_rv).m_trans=t_node.p_GetAttribute("trans","");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<233>";
	if(dbg_object(t_rv).m_trans.length>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<234>";
		dbg_object(t_rv).m_transR=bb_tile_HexToDec(dbg_object(t_rv).m_trans.slice(0,2));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<235>";
		dbg_object(t_rv).m_transG=bb_tile_HexToDec(dbg_object(t_rv).m_trans.slice(2,4));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<236>";
		dbg_object(t_rv).m_transB=bb_tile_HexToDec(dbg_object(t_rv).m_trans.slice(4,6));
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<239>";
	this.p_DoPostLoad(t_rv);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<240>";
	pop_err();
	return t_rv;
}
c_TiledTileMapReader.prototype.p_ReadTile=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<244>";
	var t_id=parseInt((t_node.p_GetAttribute("id","0")),10);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<245>";
	var t_rv=this.m_tileMap.p_CreateTile(t_id);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<246>";
	this.p_ReadProperties(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<247>";
	this.p_DoPostLoad(t_rv);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<248>";
	pop_err();
	return t_rv;
}
c_TiledTileMapReader.prototype.p_ReadTileset=function(t_node,t_target){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<149>";
	var t_rv=t_target;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<150>";
	this.p_ReadProperties(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<151>";
	if(t_rv==null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<151>";
		t_rv=this.m_tileMap.p_CreateTileset();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<152>";
	if(t_node.p_HasAttribute("firstgid")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<152>";
		dbg_object(t_rv).m_firstGid=parseInt((t_node.p_GetAttribute("firstgid","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<154>";
	if(t_node.p_HasAttribute("source")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<155>";
		dbg_object(t_rv).m_source=t_node.p_GetAttribute("source","");
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<156>";
		var t_parser=c_XMLParser.m_new.call(new c_XMLParser);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<157>";
		var t_tilesetdoc=t_parser.p_ParseFile(dbg_object(t_rv).m_source);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<158>";
		var t_=this.p_ReadTileset(t_tilesetdoc.p_Root(),t_rv);
		pop_err();
		return t_;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<160>";
		if(t_node.p_HasAttribute("name")){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<160>";
			dbg_object(t_rv).m_name=t_node.p_GetAttribute("name","");
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<161>";
		if(t_node.p_HasAttribute("tilewidth")){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<161>";
			dbg_object(t_rv).m_tileWidth=parseInt((t_node.p_GetAttribute("tilewidth","")),10);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<162>";
		if(t_node.p_HasAttribute("tileheight")){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<162>";
			dbg_object(t_rv).m_tileHeight=parseInt((t_node.p_GetAttribute("tileheight","")),10);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<163>";
		if(t_node.p_HasAttribute("spacing")){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<163>";
			dbg_object(t_rv).m_spacing=parseInt((t_node.p_GetAttribute("spacing","")),10);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<164>";
		if(t_node.p_HasAttribute("margin")){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<164>";
			dbg_object(t_rv).m_margin=parseInt((t_node.p_GetAttribute("margin","")),10);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<166>";
		if(!t_node.p_Children().p_IsEmpty()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<167>";
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<167>";
			var t_2=t_node.p_Children().p_ObjectEnumerator();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<167>";
			while(t_2.p_HasNext()){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<167>";
				var t_child=t_2.p_NextObject();
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<168>";
				if(t_child.p_Name()=="image"){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<169>";
					dbg_object(t_rv).m_imageNode=this.p_ReadImage(t_child);
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<170>";
					if(t_child.p_Name()=="tile"){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<171>";
						dbg_object(t_rv).m_tileNodes.p_Add3(this.p_ReadTile(t_child));
					}
				}
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<176>";
	this.p_DoPostLoad(t_rv);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<177>";
	pop_err();
	return t_rv;
}
c_TiledTileMapReader.prototype.p_ReadLayerAttributes=function(t_node,t_layer){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<181>";
	if(t_node.p_HasAttribute("name")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<181>";
		dbg_object(t_layer).m_name=t_node.p_GetAttribute("name","");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<182>";
	if(t_node.p_HasAttribute("width")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<182>";
		dbg_object(t_layer).m_width=parseInt((t_node.p_GetAttribute("width","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<183>";
	if(t_node.p_HasAttribute("height")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<183>";
		dbg_object(t_layer).m_height=parseInt((t_node.p_GetAttribute("height","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<184>";
	dbg_object(t_layer).m_visible=((!t_node.p_HasAttribute("visible") || parseInt((t_node.p_GetAttribute("visible","")),10)!=0)?1:0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<185>";
	if(t_node.p_HasAttribute("opacity")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<185>";
		dbg_object(t_layer).m_opacity=parseFloat(t_node.p_GetAttribute("opacity",""));
	}
	pop_err();
}
c_TiledTileMapReader.prototype.p_ReadTileData=function(t_node,t_layer){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<265>";
	var t_rv=this.m_tileMap.p_CreateData(dbg_object(t_layer).m_width,dbg_object(t_layer).m_height);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<268>";
	var t_encoding="";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<269>";
	if(t_node.p_HasAttribute("encoding")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<269>";
		t_encoding=t_node.p_GetAttribute("encoding","");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<270>";
	if(t_encoding==""){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<272>";
		bb_assert_AssertError("Raw xml is currently not supported");
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<273>";
		if(t_encoding=="csv"){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<274>";
			var t_csv=t_node.p_Value().split(",");
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<275>";
			for(var t_i=0;t_i<t_csv.length;t_i=t_i+1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<276>";
				var t_gid=parseInt((string_trim(dbg_array(t_csv,t_i)[dbg_index])),10);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<277>";
				dbg_array(dbg_object(t_rv).m_tiles,t_i)[dbg_index]=t_gid
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<278>";
				dbg_array(dbg_object(t_rv).m_cells,t_i)[dbg_index]=this.m_tileMap.p_CreateCell(t_gid,t_i % dbg_object(t_rv).m_width,((t_i/dbg_object(t_rv).m_width)|0))
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<280>";
			if(t_encoding=="base64"){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<281>";
				var t_bytes=bb_base64_DecodeBase64Bytes(t_node.p_Value());
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<282>";
				if(t_node.p_HasAttribute("compression")){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<284>";
					bb_assert_AssertError("Compression is currently not supported");
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<286>";
				for(var t_i2=0;t_i2<t_bytes.length;t_i2=t_i2+4){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<288>";
					var t_gid2=dbg_array(t_bytes,t_i2)[dbg_index];
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<289>";
					t_gid2+=dbg_array(t_bytes,t_i2+1)[dbg_index]<<8;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<290>";
					t_gid2+=dbg_array(t_bytes,t_i2+2)[dbg_index]<<16;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<291>";
					t_gid2+=dbg_array(t_bytes,t_i2+3)[dbg_index]<<24;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<292>";
					dbg_array(dbg_object(t_rv).m_tiles,((t_i2/4)|0))[dbg_index]=t_gid2
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<293>";
					dbg_array(dbg_object(t_rv).m_cells,((t_i2/4)|0))[dbg_index]=this.m_tileMap.p_CreateCell(t_gid2,((t_i2/4)|0) % dbg_object(t_rv).m_width,((((t_i2/4)|0)/dbg_object(t_rv).m_width)|0))
				}
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<296>";
	pop_err();
	return t_rv;
}
c_TiledTileMapReader.prototype.p_ReadTileLayer=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<189>";
	var t_rv=this.m_tileMap.p_CreateTileLayer();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<190>";
	this.p_ReadProperties(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<191>";
	this.p_ReadLayerAttributes(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<193>";
	if(dbg_object(t_rv).m_properties.p_Has("parallax_offset_x")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<193>";
		dbg_object(t_rv).m_parallaxOffsetX=dbg_object(t_rv).m_properties.p_Get("parallax_offset_x").p_GetFloat();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<194>";
	if(dbg_object(t_rv).m_properties.p_Has("parallax_offset_y")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<194>";
		dbg_object(t_rv).m_parallaxOffsetY=dbg_object(t_rv).m_properties.p_Get("parallax_offset_y").p_GetFloat();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<195>";
	if(dbg_object(t_rv).m_properties.p_Has("parallax_scale_x")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<195>";
		dbg_object(t_rv).m_parallaxScaleX=dbg_object(t_rv).m_properties.p_Get("parallax_scale_x").p_GetFloat();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<196>";
	if(dbg_object(t_rv).m_properties.p_Has("parallax_scale_y")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<196>";
		dbg_object(t_rv).m_parallaxScaleY=dbg_object(t_rv).m_properties.p_Get("parallax_scale_y").p_GetFloat();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<198>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<198>";
	var t_=t_node.p_Children().p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<198>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<198>";
		var t_child=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<199>";
		if(t_child.p_Name()=="data"){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<200>";
			dbg_object(t_rv).m_mapData=this.p_ReadTileData(t_child,t_rv);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<204>";
	this.p_DoPostLoad(t_rv);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<205>";
	pop_err();
	return t_rv;
}
c_TiledTileMapReader.prototype.p_ReadObject=function(t_node,t_layer){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<252>";
	var t_rv=this.m_tileMap.p_CreateObject();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<253>";
	this.p_ReadProperties(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<254>";
	if(t_node.p_HasAttribute("name")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<254>";
		dbg_object(t_rv).m_name=t_node.p_GetAttribute("name","");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<255>";
	if(t_node.p_HasAttribute("type")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<255>";
		dbg_object(t_rv).m_objectType=t_node.p_GetAttribute("type","");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<256>";
	if(t_node.p_HasAttribute("x")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<256>";
		dbg_object(t_rv).m_x=parseInt((t_node.p_GetAttribute("x","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<257>";
	if(t_node.p_HasAttribute("y")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<257>";
		dbg_object(t_rv).m_y=parseInt((t_node.p_GetAttribute("y","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<258>";
	if(t_node.p_HasAttribute("width")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<258>";
		dbg_object(t_rv).m_width=parseInt((t_node.p_GetAttribute("width","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<259>";
	if(t_node.p_HasAttribute("height")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<259>";
		dbg_object(t_rv).m_height=parseInt((t_node.p_GetAttribute("height","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<260>";
	this.p_DoPostLoad(t_rv);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<261>";
	pop_err();
	return t_rv;
}
c_TiledTileMapReader.prototype.p_ReadObjectLayer=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<209>";
	var t_rv=this.m_tileMap.p_CreateObjectLayer();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<210>";
	this.p_ReadProperties(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<211>";
	this.p_ReadLayerAttributes(t_node,(t_rv));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<213>";
	if(t_node.p_HasAttribute("color")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<213>";
		dbg_object(t_rv).m_color=bb_tile_ColorToInt(t_node.p_GetAttribute("color",""));
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<215>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<215>";
	var t_=t_node.p_Children().p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<215>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<215>";
		var t_child=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<216>";
		if(t_child.p_Name()=="object"){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<217>";
			dbg_object(t_rv).m_objects.p_Add5(this.p_ReadObject(t_child,t_rv));
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<221>";
	this.p_DoPostLoad(t_rv);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<222>";
	pop_err();
	return t_rv;
}
c_TiledTileMapReader.prototype.p_ReadMap=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<79>";
	this.m_tileMap=this.p_CreateMap();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<80>";
	this.p_ReadProperties(t_node,(this.m_tileMap));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<83>";
	if(dbg_object(this.m_tileMap).m_properties.p_Has("wrap_x")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<83>";
		dbg_object(this.m_tileMap).m_wrapX=dbg_object(this.m_tileMap).m_properties.p_Get("wrap_x").p_GetBool();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<84>";
	if(dbg_object(this.m_tileMap).m_properties.p_Has("wrap_y")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<84>";
		dbg_object(this.m_tileMap).m_wrapY=dbg_object(this.m_tileMap).m_properties.p_Get("wrap_y").p_GetBool();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<87>";
	if(t_node.p_HasAttribute("version")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<87>";
		dbg_object(this.m_tileMap).m_version=t_node.p_GetAttribute("version","");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<88>";
	if(t_node.p_HasAttribute("orientation")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<88>";
		dbg_object(this.m_tileMap).m_orientation=t_node.p_GetAttribute("orientation","");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<89>";
	if(t_node.p_HasAttribute("width")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<89>";
		dbg_object(this.m_tileMap).m_width=parseInt((t_node.p_GetAttribute("width","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<90>";
	if(t_node.p_HasAttribute("height")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<90>";
		dbg_object(this.m_tileMap).m_height=parseInt((t_node.p_GetAttribute("height","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<91>";
	if(t_node.p_HasAttribute("tilewidth")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<91>";
		dbg_object(this.m_tileMap).m_tileWidth=parseInt((t_node.p_GetAttribute("tilewidth","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<92>";
	if(t_node.p_HasAttribute("tileheight")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<92>";
		dbg_object(this.m_tileMap).m_tileHeight=parseInt((t_node.p_GetAttribute("tileheight","")),10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<94>";
	dbg_object(this.m_tileMap).m_maxTileWidth=dbg_object(this.m_tileMap).m_tileWidth;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<95>";
	dbg_object(this.m_tileMap).m_maxTileHeight=dbg_object(this.m_tileMap).m_tileHeight;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<98>";
	if(!t_node.p_Children().p_IsEmpty()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<99>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<99>";
		var t_=t_node.p_Children().p_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<99>";
		while(t_.p_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<99>";
			var t_mapchild=t_.p_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<101>";
			if(t_mapchild.p_Name()=="tileset"){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<102>";
				var t_ts=this.p_ReadTileset(t_mapchild,null);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<103>";
				dbg_object(this.m_tileMap).m_tilesets.p_Set6(dbg_object(t_ts).m_name,t_ts);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<106>";
				if(t_mapchild.p_Name()=="layer"){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<107>";
					var t_layer=(this.p_ReadTileLayer(t_mapchild));
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<108>";
					dbg_object(this.m_tileMap).m_layers.p_Add4(t_layer);
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<111>";
					if(t_mapchild.p_Name()=="objectgroup"){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<112>";
						var t_layer2=(this.p_ReadObjectLayer(t_mapchild));
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<113>";
						dbg_object(this.m_tileMap).m_layers.p_Add4(t_layer2);
					}
				}
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<118>";
	this.p_DoPostLoad(this.m_tileMap);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<120>";
	pop_err();
	return this.m_tileMap;
}
c_TiledTileMapReader.prototype.p_LoadMap=function(t_filename){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<62>";
	var t_parser=c_XMLParser.m_new.call(new c_XMLParser);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<63>";
	var t_xmlString=bb_app_LoadString(t_filename);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<65>";
	if(!((t_xmlString).length!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<66>";
		bb_assert_AssertError("Cannot load tile map file "+t_filename);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<69>";
	var t_findData=t_xmlString.indexOf("<data encoding",0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<70>";
	if(t_findData==-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<71>";
		bb_assert_AssertError("Tiled Raw XML is not supported!");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<74>";
	this.m_doc=t_parser.p_ParseString(t_xmlString);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<75>";
	var t_=this.p_ReadMap(this.m_doc.p_Root());
	pop_err();
	return t_;
}
function c_MyTiledTileMapReader(){
	c_TiledTileMapReader.call(this);
}
c_MyTiledTileMapReader.prototype=extend_class(c_TiledTileMapReader);
c_MyTiledTileMapReader.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<3>";
	c_TiledTileMapReader.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<3>";
	pop_err();
	return this;
}
c_MyTiledTileMapReader.prototype.p_CreateMap=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<5>";
	var t_=(c_MyTileMap.m_new.call(new c_MyTileMap));
	pop_err();
	return t_;
}
function c_TileMapPropertyContainer(){
	Object.call(this);
	this.m_properties=c_TileMapProperties.m_new.call(new c_TileMapProperties);
}
c_TileMapPropertyContainer.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<18>";
	pop_err();
	return this;
}
function c_TileMap(){
	c_TileMapPropertyContainer.call(this);
	this.m_wrapX=false;
	this.m_wrapY=false;
	this.m_version="1.0";
	this.m_orientation="orthogonal";
	this.m_width=0;
	this.m_height=0;
	this.m_tileWidth=32;
	this.m_tileHeight=32;
	this.m_maxTileWidth=0;
	this.m_maxTileHeight=0;
	this.m_tilesets=c_StringMap7.m_new.call(new c_StringMap7);
	this.m_layers=c_ArrayList6.m_new.call(new c_ArrayList6);
	this.m_tiles=[];
	this.implments={c_ITileMapPostLoad:1};
}
c_TileMap.prototype=extend_class(c_TileMapPropertyContainer);
c_TileMap.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<322>";
	c_TileMapPropertyContainer.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<322>";
	pop_err();
	return this;
}
c_TileMap.prototype.p_CreateTileset=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<383>";
	var t_=c_TileMapTileset.m_new.call(new c_TileMapTileset);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_CreateImage=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<398>";
	var t_=c_TileMapImage.m_new.call(new c_TileMapImage);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_CreateTile=function(t_id){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<378>";
	var t_=c_TileMapTile.m_new.call(new c_TileMapTile,t_id);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_CreateTileLayer=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<388>";
	var t_=c_TileMapTileLayer.m_new.call(new c_TileMapTileLayer);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_CreateData=function(t_width,t_height){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<413>";
	var t_=c_TileMapData.m_new.call(new c_TileMapData,t_width,t_height);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_CreateCell=function(t_gid,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<408>";
	var t_=c_TileMapCell.m_new.call(new c_TileMapCell,t_gid,t_x,t_y);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_CreateObjectLayer=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<393>";
	var t_=c_TileMapObjectLayer.m_new.call(new c_TileMapObjectLayer);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_CreateObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<403>";
	var t_=c_TileMapObject.m_new.call(new c_TileMapObject);
	pop_err();
	return t_;
}
c_TileMap.prototype.p_PreRenderMap=function(){
	push_err();
	pop_err();
}
c_TileMap.prototype.p_ConfigureLayer=function(t_tileLayer){
	push_err();
	pop_err();
}
c_TileMap.prototype.p_PreRenderLayer=function(t_tileLayer){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<350>";
	this.p_ConfigureLayer(t_tileLayer);
	pop_err();
}
c_TileMap.prototype.p_DrawTile2=function(t_tileLayer,t_mapTile,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<373>";
	dbg_object(t_mapTile).m_image.p_DrawTile((t_x),(t_y),dbg_object(t_mapTile).m_id,0.0,1.0,1.0);
	pop_err();
}
c_TileMap.prototype.p_PostRenderLayer=function(t_tileLayer){
	push_err();
	pop_err();
}
c_TileMap.prototype.p_PostRenderMap=function(){
	push_err();
	pop_err();
}
c_TileMap.prototype.p_RenderMap=function(t_bx,t_by,t_bw,t_bh,t_sx,t_sy){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<496>";
	this.p_PreRenderMap();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_x=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_y=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_rx=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_ry=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_mx=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_my=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_mx2=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_my2=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_modx=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>";
	var t_mody=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<498>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<498>";
	var t_=this.m_layers.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<498>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<498>";
		var t_layer=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<499>";
		if(((dbg_object(t_layer).m_visible)!=0) && object_downcast((t_layer),c_TileMapTileLayer)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<500>";
			var t_tl=object_downcast((t_layer),c_TileMapTileLayer);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<501>";
			var t_mapTile=null;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<501>";
			var t_gid=0;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<502>";
			this.p_PreRenderLayer(t_layer);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<504>";
			if(this.m_orientation=="orthogonal"){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<505>";
				t_modx=(((t_bx)*dbg_object(t_tl).m_parallaxScaleX % (this.m_tileWidth))|0);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<506>";
				t_mody=(((t_by)*dbg_object(t_tl).m_parallaxScaleY % (this.m_tileHeight))|0);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<507>";
				t_y=t_by+this.m_tileHeight-dbg_object(t_tl).m_maxTileHeight;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<508>";
				t_my=((Math.floor((t_by)*dbg_object(t_tl).m_parallaxScaleY/(this.m_tileHeight)))|0);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<509>";
				while(t_y<t_by+t_bh+dbg_object(t_tl).m_maxTileHeight){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<510>";
					t_x=t_bx+this.m_tileWidth-dbg_object(t_tl).m_maxTileWidth;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<511>";
					t_mx=((Math.floor((t_bx)*dbg_object(t_tl).m_parallaxScaleX/(this.m_tileWidth)))|0);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<512>";
					while(t_x<t_bx+t_bw+dbg_object(t_tl).m_maxTileWidth){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<513>";
						if((this.m_wrapX || t_mx>=0 && t_mx<this.m_width) && (this.m_wrapY || t_my>=0 && t_my<this.m_height)){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<514>";
							t_mx2=t_mx;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<515>";
							t_my2=t_my;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<516>";
							while(t_mx2<0){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<517>";
								t_mx2+=this.m_width;
							}
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<519>";
							while(t_mx2>=this.m_width){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<520>";
								t_mx2-=this.m_width;
							}
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<522>";
							while(t_my2<0){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<523>";
								t_my2+=this.m_height;
							}
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<525>";
							while(t_my2>=this.m_height){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<526>";
								t_my2-=this.m_height;
							}
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<528>";
							t_gid=dbg_object(dbg_array(dbg_object(dbg_object(t_tl).m_mapData).m_cells,t_mx2+t_my2*dbg_object(dbg_object(t_tl).m_mapData).m_width)[dbg_index]).m_gid;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<529>";
							if(t_gid>0){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<530>";
								t_mapTile=dbg_array(this.m_tiles,t_gid-1)[dbg_index];
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<532>";
								if(t_modx<0){
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<532>";
									t_modx+=this.m_tileWidth;
								}
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<533>";
								if(t_mody<0){
									err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<533>";
									t_mody+=this.m_tileHeight;
								}
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<534>";
								t_rx=t_x-t_modx-t_bx;
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<535>";
								t_ry=t_y-t_mody-t_by;
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<537>";
								this.p_DrawTile2(t_tl,t_mapTile,t_rx,t_ry);
							}
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<540>";
						t_x+=this.m_tileWidth;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<541>";
						t_mx+=1;
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<543>";
					t_y+=this.m_tileHeight;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<544>";
					t_my+=1;
				}
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<548>";
				if(this.m_orientation=="isometric"){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<550>";
					for(t_y=0;t_y<dbg_object(t_tl).m_width+dbg_object(t_tl).m_height;t_y=t_y+1){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<551>";
						t_ry=t_y;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<552>";
						t_rx=0;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<553>";
						while(t_ry>=dbg_object(t_tl).m_height){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<554>";
							t_ry-=1;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<555>";
							t_rx+=1;
						}
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<557>";
						while(t_ry>=0 && t_rx<dbg_object(t_tl).m_width){
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<558>";
							t_gid=dbg_object(dbg_array(dbg_object(dbg_object(t_tl).m_mapData).m_cells,t_rx+t_ry*dbg_object(dbg_object(t_tl).m_mapData).m_width)[dbg_index]).m_gid;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<559>";
							if(t_gid>0){
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<560>";
								t_mapTile=dbg_array(this.m_tiles,t_gid-1)[dbg_index];
								err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<561>";
								this.p_DrawTile2(t_tl,t_mapTile,(((t_rx-t_ry-1)*this.m_tileWidth/2)|0)-t_bx,(((t_rx+t_ry+2)*this.m_tileHeight/2)|0)-dbg_object(t_mapTile).m_height-t_by);
							}
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<563>";
							t_ry-=1;
							err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<564>";
							t_rx+=1;
						}
					}
				}
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<568>";
			this.p_PostRenderLayer(t_layer);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<571>";
	this.p_PostRenderMap();
	pop_err();
}
c_TileMap.prototype.p_PostLoad=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<418>";
	var t_totaltiles=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<418>";
	var t_ts=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<419>";
	var t_alltiles=c_ArrayList5.m_new.call(new c_ArrayList5);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<420>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<420>";
	var t_=this.m_tilesets.p_Values().p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<420>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<420>";
		var t_ts2=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<422>";
		dbg_object(t_ts2).m_image=dbg_object(bb_framework_diddyGame).m_images.p_LoadTileset2(dbg_object(dbg_object(t_ts2).m_imageNode).m_source,dbg_object(t_ts2).m_tileWidth,dbg_object(t_ts2).m_tileHeight,dbg_object(t_ts2).m_margin,dbg_object(t_ts2).m_spacing,"",false,true,false,0,0,0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<424>";
		dbg_object(t_ts2).m_tileCount=dbg_object(dbg_object(t_ts2).m_image).m_tileCount;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<427>";
		if(this.m_maxTileWidth<dbg_object(t_ts2).m_tileWidth){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<427>";
			this.m_maxTileWidth=dbg_object(t_ts2).m_tileWidth;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<428>";
		if(this.m_maxTileHeight<dbg_object(t_ts2).m_tileHeight){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<428>";
			this.m_maxTileHeight=dbg_object(t_ts2).m_tileHeight;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<431>";
		dbg_object(t_ts2).m_tiles=new_object_array(dbg_object(t_ts2).m_tileCount);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<432>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<432>";
		var t_2=dbg_object(t_ts2).m_tileNodes.p_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<432>";
		while(t_2.p_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<432>";
			var t_t=t_2.p_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<433>";
			dbg_array(dbg_object(t_ts2).m_tiles,dbg_object(t_t).m_id)[dbg_index]=t_t
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<435>";
		for(var t_i=0;t_i<dbg_object(t_ts2).m_tiles.length;t_i=t_i+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<436>";
			if(dbg_array(dbg_object(t_ts2).m_tiles,t_i)[dbg_index]==null){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<437>";
				dbg_array(dbg_object(t_ts2).m_tiles,t_i)[dbg_index]=this.p_CreateTile(t_i)
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<439>";
			dbg_object(dbg_array(dbg_object(t_ts2).m_tiles,t_i)[dbg_index]).m_gid=dbg_object(t_ts2).m_firstGid+t_i;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<440>";
			dbg_object(dbg_array(dbg_object(t_ts2).m_tiles,t_i)[dbg_index]).m_image=dbg_object(t_ts2).m_image;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<441>";
			dbg_object(dbg_array(dbg_object(t_ts2).m_tiles,t_i)[dbg_index]).m_width=dbg_object(t_ts2).m_tileWidth;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<442>";
			dbg_object(dbg_array(dbg_object(t_ts2).m_tiles,t_i)[dbg_index]).m_height=dbg_object(t_ts2).m_tileHeight;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<443>";
			t_alltiles.p_Add3(dbg_array(dbg_object(t_ts2).m_tiles,t_i)[dbg_index]);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<446>";
		t_totaltiles+=dbg_object(t_ts2).m_tileCount;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<450>";
	this.m_tiles=new_object_array(t_totaltiles);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<451>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<451>";
	var t_3=t_alltiles.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<451>";
	while(t_3.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<451>";
		var t_t2=t_3.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<452>";
		dbg_array(this.m_tiles,dbg_object(t_t2).m_gid-1)[dbg_index]=t_t2
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<456>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<456>";
	var t_4=this.m_layers.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<456>";
	while(t_4.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<456>";
		var t_l=t_4.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<457>";
		if(object_downcast((t_l),c_TileMapTileLayer)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<458>";
			var t_tl=object_downcast((t_l),c_TileMapTileLayer);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<459>";
			for(var t_i2=0;t_i2<dbg_object(dbg_object(t_tl).m_mapData).m_tiles.length;t_i2=t_i2+1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<460>";
				if(dbg_array(dbg_object(dbg_object(t_tl).m_mapData).m_tiles,t_i2)[dbg_index]>0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<461>";
					if(dbg_object(t_tl).m_maxTileWidth<dbg_object(dbg_array(this.m_tiles,dbg_array(dbg_object(dbg_object(t_tl).m_mapData).m_tiles,t_i2)[dbg_index]-1)[dbg_index]).m_width){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<461>";
						dbg_object(t_tl).m_maxTileWidth=dbg_object(dbg_array(this.m_tiles,dbg_array(dbg_object(dbg_object(t_tl).m_mapData).m_tiles,t_i2)[dbg_index]-1)[dbg_index]).m_width;
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<462>";
					if(dbg_object(t_tl).m_maxTileHeight<dbg_object(dbg_array(this.m_tiles,dbg_array(dbg_object(dbg_object(t_tl).m_mapData).m_tiles,t_i2)[dbg_index]-1)[dbg_index]).m_height){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<462>";
						dbg_object(t_tl).m_maxTileHeight=dbg_object(dbg_array(this.m_tiles,dbg_array(dbg_object(dbg_object(t_tl).m_mapData).m_tiles,t_i2)[dbg_index]-1)[dbg_index]).m_height;
					}
				}
			}
		}
	}
	pop_err();
}
function c_TileMapProperty(){
	Object.call(this);
	this.m_name="";
	this.m_rawValue="";
	this.m_valueType=0;
}
c_TileMapProperty.m_new=function(t_name,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<946>";
	dbg_object(this).m_name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<947>";
	dbg_object(this).m_rawValue=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<948>";
	dbg_object(this).m_valueType=3;
	pop_err();
	return this;
}
c_TileMapProperty.prototype.p_GetBool=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<984>";
	var t_val=this.m_rawValue.toLowerCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<985>";
	if(t_val=="true" || t_val=="t" || t_val=="y"){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<985>";
		pop_err();
		return true;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<986>";
	pop_err();
	return false;
}
c_TileMapProperty.prototype.p_GetFloat=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<980>";
	var t_=parseFloat(this.m_rawValue);
	pop_err();
	return t_;
}
c_TileMapProperty.prototype.p_GetInt2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<976>";
	var t_=parseInt((this.m_rawValue),10);
	pop_err();
	return t_;
}
function c_TileMapProperties(){
	Object.call(this);
	this.m_props=c_StringMap6.m_new.call(new c_StringMap6);
}
c_TileMapProperties.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<303>";
	pop_err();
	return this;
}
c_TileMapProperties.prototype.p_Has=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<307>";
	var t_=this.m_props.p_Contains(t_name);
	pop_err();
	return t_;
}
c_TileMapProperties.prototype.p_Get=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<311>";
	var t_=this.m_props.p_Get(t_name);
	pop_err();
	return t_;
}
function c_Map6(){
	Object.call(this);
	this.m_root=null;
}
c_Map6.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
c_Map6.prototype.p_Compare=function(t_lhs,t_rhs){
}
c_Map6.prototype.p_RotateLeft5=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>";
	var t_child=dbg_object(t_node).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>";
	dbg_object(t_node).m_right=dbg_object(t_child).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>";
	if((dbg_object(t_child).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>";
		dbg_object(dbg_object(t_child).m_left).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>";
	dbg_object(t_child).m_left=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map6.prototype.p_RotateRight5=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>";
	var t_child=dbg_object(t_node).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>";
	dbg_object(t_node).m_left=dbg_object(t_child).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>";
	if((dbg_object(t_child).m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>";
		dbg_object(dbg_object(t_child).m_right).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>";
	dbg_object(t_child).m_right=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map6.prototype.p_InsertFixup5=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>";
	while(((dbg_object(t_node).m_parent)!=null) && dbg_object(dbg_object(t_node).m_parent).m_color==-1 && ((dbg_object(dbg_object(t_node).m_parent).m_parent)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>";
		if(dbg_object(t_node).m_parent==dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>";
			var t_uncle=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_right;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>";
			if(((t_uncle)!=null) && dbg_object(t_uncle).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>";
				dbg_object(t_uncle).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>";
				dbg_object(dbg_object(t_uncle).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>";
				t_node=dbg_object(t_uncle).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>";
					this.p_RotateLeft5(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>";
				this.p_RotateRight5(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>";
			var t_uncle2=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>";
			if(((t_uncle2)!=null) && dbg_object(t_uncle2).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>";
				dbg_object(t_uncle2).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>";
				dbg_object(dbg_object(t_uncle2).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>";
				t_node=dbg_object(t_uncle2).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>";
					this.p_RotateRight5(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>";
				this.p_RotateLeft5(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>";
	dbg_object(this.m_root).m_color=1;
	pop_err();
	return 0;
}
c_Map6.prototype.p_Set5=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_parent=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_cmp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>";
		t_parent=t_node;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>";
		t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>";
				dbg_object(t_node).m_value=t_value;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>";
				pop_err();
				return false;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>";
	t_node=c_Node6.m_new.call(new c_Node6,t_key,t_value,-1,t_parent);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>";
	if((t_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>";
			dbg_object(t_parent).m_right=t_node;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>";
			dbg_object(t_parent).m_left=t_node;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>";
		this.p_InsertFixup5(t_node);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>";
		this.m_root=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>";
	pop_err();
	return true;
}
c_Map6.prototype.p_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>";
				pop_err();
				return t_node;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>";
	pop_err();
	return t_node;
}
c_Map6.prototype.p_Contains=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>";
	var t_=this.p_FindNode(t_key)!=null;
	pop_err();
	return t_;
}
c_Map6.prototype.p_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.p_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).m_value;
	}
	pop_err();
	return null;
}
function c_StringMap6(){
	c_Map6.call(this);
}
c_StringMap6.prototype=extend_class(c_Map6);
c_StringMap6.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	c_Map6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
c_StringMap6.prototype.p_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function c_Node6(){
	Object.call(this);
	this.m_key="";
	this.m_right=null;
	this.m_left=null;
	this.m_value=null;
	this.m_color=0;
	this.m_parent=null;
}
c_Node6.m_new=function(t_key,t_value,t_color,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>";
	dbg_object(this).m_key=t_key;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>";
	dbg_object(this).m_value=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>";
	dbg_object(this).m_color=t_color;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>";
	dbg_object(this).m_parent=t_parent;
	pop_err();
	return this;
}
c_Node6.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>";
	pop_err();
	return this;
}
function c_TileMapTileset(){
	Object.call(this);
	this.m_firstGid=0;
	this.m_source="";
	this.m_name="";
	this.m_tileWidth=0;
	this.m_tileHeight=0;
	this.m_spacing=0;
	this.m_margin=0;
	this.m_imageNode=null;
	this.m_tileNodes=c_ArrayList5.m_new.call(new c_ArrayList5);
	this.m_image=null;
	this.m_tileCount=0;
	this.m_tiles=[];
	this.implments={c_ITileMapPostLoad:1};
}
c_TileMapTileset.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<820>";
	pop_err();
	return this;
}
c_TileMapTileset.prototype.p_PostLoad=function(){
	push_err();
	pop_err();
}
function c_TileMapImage(){
	Object.call(this);
	this.m_source="";
	this.m_width=0;
	this.m_height=0;
	this.m_trans="";
	this.m_transR=0;
	this.m_transG=0;
	this.m_transB=0;
	this.implments={c_ITileMapPostLoad:1};
}
c_TileMapImage.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<844>";
	pop_err();
	return this;
}
c_TileMapImage.prototype.p_PostLoad=function(){
	push_err();
	pop_err();
}
function bb_tile_HexToDec(t_hexstr){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1061>";
	var t_chars="0123456789abcdef";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1062>";
	var t_rv=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1063>";
	t_hexstr=t_hexstr.toLowerCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1064>";
	for(var t_i=0;t_i<=t_hexstr.length-1;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1065>";
		t_rv=t_rv<<4;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1066>";
		var t_idx=t_chars.indexOf(String(dbg_charCodeAt(t_hexstr,t_i)),0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1067>";
		if(t_idx>=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1067>";
			t_rv+=t_idx;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1069>";
	pop_err();
	return t_rv;
}
function c_TileMapTile(){
	c_TileMapPropertyContainer.call(this);
	this.m_id=0;
	this.m_image=null;
	this.m_height=0;
	this.m_gid=0;
	this.m_width=0;
	this.m_animDelay=0;
	this.m_animated=false;
	this.m_animNext=0;
	this.m_animDirection=0;
	this.m_hasAnimDirection=false;
	this.implments={c_ITileMapPostLoad:1};
}
c_TileMapTile.prototype=extend_class(c_TileMapPropertyContainer);
c_TileMapTile.m_new=function(t_id){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1009>";
	c_TileMapPropertyContainer.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1010>";
	dbg_object(this).m_id=t_id;
	pop_err();
	return this;
}
c_TileMapTile.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<996>";
	c_TileMapPropertyContainer.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<996>";
	pop_err();
	return this;
}
c_TileMapTile.prototype.p_PostLoad=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1014>";
	if(this.m_properties.p_Has("anim_delay")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1015>";
		this.m_animDelay=((bb_framework_diddyGame.p_CalcAnimLength(this.m_properties.p_Get("anim_delay").p_GetInt2()))|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1016>";
		this.m_animated=true;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1018>";
	if(this.m_properties.p_Has("anim_next")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1018>";
		this.m_animNext=this.m_properties.p_Get("anim_next").p_GetInt2();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1019>";
	if(this.m_properties.p_Has("anim_direction")){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1020>";
		this.m_animDirection=this.m_properties.p_Get("anim_direction").p_GetInt2();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1021>";
		this.m_hasAnimDirection=true;
	}
	pop_err();
}
function c_ICollection5(){
	Object.call(this);
}
c_ICollection5.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>";
	pop_err();
	return this;
}
c_ICollection5.prototype.p_ToArray=function(){
}
c_ICollection5.prototype.p_Add3=function(t_o){
}
c_ICollection5.prototype.p_Enumerator=function(){
}
c_ICollection5.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.p_Enumerator();
	pop_err();
	return t_;
}
c_ICollection5.prototype.p_Size=function(){
}
function c_IList5(){
	c_ICollection5.call(this);
	this.m_modCount=0;
}
c_IList5.prototype=extend_class(c_ICollection5);
c_IList5.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	c_ICollection5.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	pop_err();
	return this;
}
c_IList5.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(c_ListEnumerator5.m_new.call(new c_ListEnumerator5,this));
	pop_err();
	return t_;
}
c_IList5.prototype.p_Get2=function(t_index){
}
c_IList5.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.p_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
function c_ArrayList5(){
	c_IList5.call(this);
	this.m_elements=[];
	this.m_size=0;
}
c_ArrayList5.prototype=extend_class(c_IList5);
c_ArrayList5.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>";
	c_IList5.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>";
	dbg_object(this).m_elements=new_object_array(10);
	pop_err();
	return this;
}
c_ArrayList5.m_new2=function(t_initialCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>";
	c_IList5.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
	if(t_initialCapacity<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Capacity must be >= 0",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>";
	dbg_object(this).m_elements=new_object_array(t_initialCapacity);
	pop_err();
	return this;
}
c_ArrayList5.m_new3=function(t_c){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>";
	c_IList5.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
	if(!((t_c)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Source collection must not be null",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>";
	this.m_elements=t_c.p_ToArray();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>";
	this.m_size=this.m_elements.length;
	pop_err();
	return this;
}
c_ArrayList5.prototype.p_EnsureCapacity=function(t_minCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>";
	var t_oldCapacity=this.m_elements.length;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>";
	if(t_minCapacity>t_oldCapacity){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>";
		var t_newCapacity=((t_oldCapacity*3/2)|0)+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
		if(t_newCapacity<t_minCapacity){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
			t_newCapacity=t_minCapacity;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>";
		this.m_elements=resize_object_array(this.m_elements,t_newCapacity);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>";
		this.m_modCount+=1;
	}
	pop_err();
}
c_ArrayList5.prototype.p_Add3=function(t_o){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
	if(this.m_size+1>this.m_elements.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
		this.p_EnsureCapacity(this.m_size+1);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>";
	dbg_array(this.m_elements,this.m_size)[dbg_index]=(t_o)
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>";
	this.m_size+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>";
	this.m_modCount+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>";
	pop_err();
	return true;
}
c_ArrayList5.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(c_ArrayListEnumerator5.m_new.call(new c_ArrayListEnumerator5,this));
	pop_err();
	return t_;
}
c_ArrayList5.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>";
	var t_arr=new_object_array(this.m_size);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>";
	for(var t_i=0;t_i<this.m_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>";
		dbg_array(t_arr,t_i)[dbg_index]=dbg_array(this.m_elements,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>";
	pop_err();
	return t_arr;
}
c_ArrayList5.prototype.p_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.m_size;
}
c_ArrayList5.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.m_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.m_size),null);
	}
	pop_err();
}
c_ArrayList5.prototype.p_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.p_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.m_elements,t_index)[dbg_index]),c_TileMapTile);
	pop_err();
	return t_;
}
function c_Map7(){
	Object.call(this);
	this.m_root=null;
}
c_Map7.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
c_Map7.prototype.p_Compare=function(t_lhs,t_rhs){
}
c_Map7.prototype.p_RotateLeft6=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>";
	var t_child=dbg_object(t_node).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>";
	dbg_object(t_node).m_right=dbg_object(t_child).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>";
	if((dbg_object(t_child).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>";
		dbg_object(dbg_object(t_child).m_left).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>";
	dbg_object(t_child).m_left=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map7.prototype.p_RotateRight6=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>";
	var t_child=dbg_object(t_node).m_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>";
	dbg_object(t_node).m_left=dbg_object(t_child).m_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>";
	if((dbg_object(t_child).m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>";
		dbg_object(dbg_object(t_child).m_right).m_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>";
	dbg_object(t_child).m_parent=dbg_object(t_node).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>";
	if((dbg_object(t_node).m_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>";
		if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>";
			dbg_object(dbg_object(t_node).m_parent).m_right=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>";
			dbg_object(dbg_object(t_node).m_parent).m_left=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>";
		this.m_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>";
	dbg_object(t_child).m_right=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>";
	dbg_object(t_node).m_parent=t_child;
	pop_err();
	return 0;
}
c_Map7.prototype.p_InsertFixup6=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>";
	while(((dbg_object(t_node).m_parent)!=null) && dbg_object(dbg_object(t_node).m_parent).m_color==-1 && ((dbg_object(dbg_object(t_node).m_parent).m_parent)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>";
		if(dbg_object(t_node).m_parent==dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>";
			var t_uncle=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_right;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>";
			if(((t_uncle)!=null) && dbg_object(t_uncle).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>";
				dbg_object(t_uncle).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>";
				dbg_object(dbg_object(t_uncle).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>";
				t_node=dbg_object(t_uncle).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_right){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>";
					this.p_RotateLeft6(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>";
				this.p_RotateRight6(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>";
			var t_uncle2=dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_left;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>";
			if(((t_uncle2)!=null) && dbg_object(t_uncle2).m_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>";
				dbg_object(t_uncle2).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>";
				dbg_object(dbg_object(t_uncle2).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>";
				t_node=dbg_object(t_uncle2).m_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>";
				if(t_node==dbg_object(dbg_object(t_node).m_parent).m_left){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>";
					t_node=dbg_object(t_node).m_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>";
					this.p_RotateRight6(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>";
				dbg_object(dbg_object(t_node).m_parent).m_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>";
				dbg_object(dbg_object(dbg_object(t_node).m_parent).m_parent).m_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>";
				this.p_RotateLeft6(dbg_object(dbg_object(t_node).m_parent).m_parent);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>";
	dbg_object(this.m_root).m_color=1;
	pop_err();
	return 0;
}
c_Map7.prototype.p_Set6=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_parent=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_cmp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>";
		t_parent=t_node;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>";
		t_cmp=this.p_Compare(t_key,dbg_object(t_node).m_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>";
			t_node=dbg_object(t_node).m_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>";
				t_node=dbg_object(t_node).m_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>";
				dbg_object(t_node).m_value=t_value;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>";
				pop_err();
				return false;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>";
	t_node=c_Node7.m_new.call(new c_Node7,t_key,t_value,-1,t_parent);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>";
	if((t_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>";
			dbg_object(t_parent).m_right=t_node;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>";
			dbg_object(t_parent).m_left=t_node;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>";
		this.p_InsertFixup6(t_node);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>";
		this.m_root=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>";
	pop_err();
	return true;
}
c_Map7.prototype.p_Values=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<117>";
	var t_=c_MapValues.m_new.call(new c_MapValues,this);
	pop_err();
	return t_;
}
c_Map7.prototype.p_FirstNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
	if(!((this.m_root)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>";
	var t_node=this.m_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>";
	while((dbg_object(t_node).m_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>";
		t_node=dbg_object(t_node).m_left;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>";
	pop_err();
	return t_node;
}
function c_StringMap7(){
	c_Map7.call(this);
}
c_StringMap7.prototype=extend_class(c_Map7);
c_StringMap7.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	c_Map7.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
c_StringMap7.prototype.p_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function c_Node7(){
	Object.call(this);
	this.m_key="";
	this.m_right=null;
	this.m_left=null;
	this.m_value=null;
	this.m_color=0;
	this.m_parent=null;
}
c_Node7.m_new=function(t_key,t_value,t_color,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>";
	dbg_object(this).m_key=t_key;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>";
	dbg_object(this).m_value=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>";
	dbg_object(this).m_color=t_color;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>";
	dbg_object(this).m_parent=t_parent;
	pop_err();
	return this;
}
c_Node7.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>";
	pop_err();
	return this;
}
c_Node7.prototype.p_NextNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>";
	var t_node=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>";
	if((this.m_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>";
		t_node=this.m_right;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>";
		while((dbg_object(t_node).m_left)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>";
			t_node=dbg_object(t_node).m_left;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>";
		pop_err();
		return t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>";
	t_node=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>";
	var t_parent=dbg_object(this).m_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>";
	while(((t_parent)!=null) && t_node==dbg_object(t_parent).m_right){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>";
		t_node=t_parent;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>";
		t_parent=dbg_object(t_parent).m_parent;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>";
	pop_err();
	return t_parent;
}
function c_TileMapLayer(){
	c_TileMapPropertyContainer.call(this);
	this.m_name="";
	this.m_width=0;
	this.m_height=0;
	this.m_visible=1;
	this.m_opacity=1.0;
	this.implments={c_ITileMapPostLoad:1};
}
c_TileMapLayer.prototype=extend_class(c_TileMapPropertyContainer);
c_TileMapLayer.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<859>";
	c_TileMapPropertyContainer.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<859>";
	pop_err();
	return this;
}
c_TileMapLayer.prototype.p_PostLoad=function(){
	push_err();
	pop_err();
}
function c_TileMapTileLayer(){
	c_TileMapLayer.call(this);
	this.m_parallaxOffsetX=0.0;
	this.m_parallaxOffsetY=0.0;
	this.m_parallaxScaleX=1.0;
	this.m_parallaxScaleY=1.0;
	this.m_mapData=null;
	this.m_maxTileHeight=0;
	this.m_maxTileWidth=0;
	this.implments={c_ITileMapPostLoad:1};
}
c_TileMapTileLayer.prototype=extend_class(c_TileMapLayer);
c_TileMapTileLayer.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<905>";
	c_TileMapLayer.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<905>";
	pop_err();
	return this;
}
function c_TileMapData(){
	Object.call(this);
	this.m_width=0;
	this.m_height=0;
	this.m_tiles=[];
	this.m_cells=[];
}
c_TileMapData.m_new=function(t_width,t_height){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<880>";
	dbg_object(this).m_width=t_width;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<881>";
	dbg_object(this).m_height=t_height;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<882>";
	dbg_object(this).m_tiles=new_number_array(t_width*t_height);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<883>";
	dbg_object(this).m_cells=new_object_array(t_width*t_height);
	pop_err();
	return this;
}
c_TileMapData.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<873>";
	pop_err();
	return this;
}
function c_TileMapCell(){
	Object.call(this);
	this.m_gid=0;
	this.m_x=0;
	this.m_y=0;
	this.m_originalGid=0;
}
c_TileMapCell.m_new=function(t_gid,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1040>";
	dbg_object(this).m_gid=t_gid;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1041>";
	dbg_object(this).m_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1042>";
	dbg_object(this).m_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1043>";
	this.m_originalGid=t_gid;
	pop_err();
	return this;
}
c_TileMapCell.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1028>";
	pop_err();
	return this;
}
var bb_base64_BASE64_ARRAY=[];
function bb_base64_InitBase64(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<117>";
	if(bb_base64_BASE64_ARRAY.length==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<118>";
		bb_base64_BASE64_ARRAY=new_number_array(256);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<119>";
		var t_i=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<120>";
		for(t_i=0;t_i<bb_base64_BASE64_ARRAY.length;t_i=t_i+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<121>";
			dbg_array(bb_base64_BASE64_ARRAY,t_i)[dbg_index]=-1
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<123>";
		for(t_i=0;t_i<"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".length;t_i=t_i+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<124>";
			dbg_array(bb_base64_BASE64_ARRAY,dbg_charCodeAt("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",t_i))[dbg_index]=t_i
		}
	}
	pop_err();
}
function bb_base64_DecodeBase64Bytes(t_src){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<68>";
	bb_base64_InitBase64();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<69>";
	var t_a=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<69>";
	var t_b=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<69>";
	var t_c=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<69>";
	var t_d=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<69>";
	var t_i=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<69>";
	var t_j=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<70>";
	var t_src2=new_number_array(t_src.length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<71>";
	var t_padding=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<74>";
	var t_srclen=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<75>";
	for(t_i=0;t_i<t_src.length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<76>";
		if(dbg_array(bb_base64_BASE64_ARRAY,dbg_charCodeAt(t_src,t_i))[dbg_index]>=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<77>";
			dbg_array(t_src2,t_srclen)[dbg_index]=dbg_charCodeAt(t_src,t_i)
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<78>";
			t_srclen+=1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<80>";
			if(dbg_array(bb_base64_BASE64_ARRAY,dbg_charCodeAt(t_src,t_i))[dbg_index]==64){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<80>";
				t_padding+=1;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<85>";
	if(t_srclen==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<85>";
		pop_err();
		return [];
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<88>";
	var t_len=3*((t_srclen/4)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<89>";
	if(t_srclen % 4==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<90>";
		t_len-=t_padding;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<91>";
		if(t_padding==0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<92>";
			if(t_srclen % 4>=2){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<92>";
				t_len+=1;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<93>";
			if(t_srclen % 4==3){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<93>";
				t_len+=1;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<95>";
	var t_rv=new_number_array(t_len);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<97>";
	t_i=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<98>";
	t_j=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<99>";
	do{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<100>";
		t_a=dbg_array(bb_base64_BASE64_ARRAY,dbg_array(t_src2,t_i)[dbg_index])[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<101>";
		if(t_i+1>t_srclen){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<101>";
			break;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<102>";
		t_b=dbg_array(bb_base64_BASE64_ARRAY,dbg_array(t_src2,t_i+1)[dbg_index])[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<103>";
		if(t_i+2<t_srclen){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<103>";
			t_c=dbg_array(bb_base64_BASE64_ARRAY,dbg_array(t_src2,t_i+2)[dbg_index])[dbg_index];
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<103>";
			t_c=64;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<104>";
		if(t_i+3<t_srclen){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<104>";
			t_d=dbg_array(bb_base64_BASE64_ARRAY,dbg_array(t_src2,t_i+3)[dbg_index])[dbg_index];
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<104>";
			t_d=64;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<105>";
		dbg_array(t_rv,t_j)[dbg_index]=t_a<<2|t_b>>4
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<106>";
		if(t_j+1<t_len){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<106>";
			dbg_array(t_rv,t_j+1)[dbg_index]=(t_b&15)<<4|t_c>>2
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<107>";
		if(t_j+2<t_len){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<107>";
			dbg_array(t_rv,t_j+2)[dbg_index]=(t_c&3)<<6|t_d
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<108>";
		t_i+=4;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<109>";
		t_j+=3;
	}while(!(t_i>=t_srclen));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<111>";
	pop_err();
	return t_rv;
}
function c_ICollection6(){
	Object.call(this);
}
c_ICollection6.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>";
	pop_err();
	return this;
}
c_ICollection6.prototype.p_ToArray=function(){
}
c_ICollection6.prototype.p_Add4=function(t_o){
}
c_ICollection6.prototype.p_Enumerator=function(){
}
c_ICollection6.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.p_Enumerator();
	pop_err();
	return t_;
}
c_ICollection6.prototype.p_Size=function(){
}
function c_IList6(){
	c_ICollection6.call(this);
	this.m_modCount=0;
}
c_IList6.prototype=extend_class(c_ICollection6);
c_IList6.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	c_ICollection6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	pop_err();
	return this;
}
c_IList6.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(c_ListEnumerator6.m_new.call(new c_ListEnumerator6,this));
	pop_err();
	return t_;
}
c_IList6.prototype.p_Get2=function(t_index){
}
c_IList6.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.p_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
function c_ArrayList6(){
	c_IList6.call(this);
	this.m_elements=[];
	this.m_size=0;
}
c_ArrayList6.prototype=extend_class(c_IList6);
c_ArrayList6.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>";
	c_IList6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>";
	dbg_object(this).m_elements=new_object_array(10);
	pop_err();
	return this;
}
c_ArrayList6.m_new2=function(t_initialCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>";
	c_IList6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
	if(t_initialCapacity<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Capacity must be >= 0",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>";
	dbg_object(this).m_elements=new_object_array(t_initialCapacity);
	pop_err();
	return this;
}
c_ArrayList6.m_new3=function(t_c){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>";
	c_IList6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
	if(!((t_c)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Source collection must not be null",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>";
	this.m_elements=t_c.p_ToArray();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>";
	this.m_size=this.m_elements.length;
	pop_err();
	return this;
}
c_ArrayList6.prototype.p_EnsureCapacity=function(t_minCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>";
	var t_oldCapacity=this.m_elements.length;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>";
	if(t_minCapacity>t_oldCapacity){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>";
		var t_newCapacity=((t_oldCapacity*3/2)|0)+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
		if(t_newCapacity<t_minCapacity){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
			t_newCapacity=t_minCapacity;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>";
		this.m_elements=resize_object_array(this.m_elements,t_newCapacity);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>";
		this.m_modCount+=1;
	}
	pop_err();
}
c_ArrayList6.prototype.p_Add4=function(t_o){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
	if(this.m_size+1>this.m_elements.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
		this.p_EnsureCapacity(this.m_size+1);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>";
	dbg_array(this.m_elements,this.m_size)[dbg_index]=(t_o)
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>";
	this.m_size+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>";
	this.m_modCount+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>";
	pop_err();
	return true;
}
c_ArrayList6.prototype.p_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(c_ArrayListEnumerator6.m_new.call(new c_ArrayListEnumerator6,this));
	pop_err();
	return t_;
}
c_ArrayList6.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>";
	var t_arr=new_object_array(this.m_size);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>";
	for(var t_i=0;t_i<this.m_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>";
		dbg_array(t_arr,t_i)[dbg_index]=dbg_array(this.m_elements,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>";
	pop_err();
	return t_arr;
}
c_ArrayList6.prototype.p_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.m_size;
}
c_ArrayList6.prototype.p_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.m_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw c_IndexOutOfBoundsException.m_new.call(new c_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.m_size),null);
	}
	pop_err();
}
c_ArrayList6.prototype.p_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.p_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.m_elements,t_index)[dbg_index]),c_TileMapLayer);
	pop_err();
	return t_;
}
function c_TileMapObjectLayer(){
	c_TileMapLayer.call(this);
	this.m_color=0;
	this.m_objects=c_ArrayList7.m_new.call(new c_ArrayList7);
	this.implments={c_ITileMapPostLoad:1};
}
c_TileMapObjectLayer.prototype=extend_class(c_TileMapLayer);
c_TileMapObjectLayer.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<917>";
	c_TileMapLayer.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<917>";
	pop_err();
	return this;
}
function bb_tile_ColorToInt(t_str){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1055>";
	pop_err();
	return 0;
}
function c_TileMapObject(){
	c_TileMapPropertyContainer.call(this);
	this.m_name="";
	this.m_objectType="";
	this.m_x=0;
	this.m_y=0;
	this.m_width=0;
	this.m_height=0;
}
c_TileMapObject.prototype=extend_class(c_TileMapPropertyContainer);
c_TileMapObject.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<926>";
	c_TileMapPropertyContainer.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<926>";
	pop_err();
	return this;
}
function c_ICollection7(){
	Object.call(this);
}
c_ICollection7.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>";
	pop_err();
	return this;
}
c_ICollection7.prototype.p_ToArray=function(){
}
c_ICollection7.prototype.p_Add5=function(t_o){
}
function c_IList7(){
	c_ICollection7.call(this);
	this.m_modCount=0;
}
c_IList7.prototype=extend_class(c_ICollection7);
c_IList7.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	c_ICollection7.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	pop_err();
	return this;
}
function c_ArrayList7(){
	c_IList7.call(this);
	this.m_elements=[];
	this.m_size=0;
}
c_ArrayList7.prototype=extend_class(c_IList7);
c_ArrayList7.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>";
	c_IList7.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>";
	dbg_object(this).m_elements=new_object_array(10);
	pop_err();
	return this;
}
c_ArrayList7.m_new2=function(t_initialCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>";
	c_IList7.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
	if(t_initialCapacity<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Capacity must be >= 0",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>";
	dbg_object(this).m_elements=new_object_array(t_initialCapacity);
	pop_err();
	return this;
}
c_ArrayList7.m_new3=function(t_c){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>";
	c_IList7.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
	if(!((t_c)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
		throw c_IllegalArgumentException.m_new.call(new c_IllegalArgumentException,"ArrayList.New: Source collection must not be null",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>";
	this.m_elements=t_c.p_ToArray();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>";
	this.m_size=this.m_elements.length;
	pop_err();
	return this;
}
c_ArrayList7.prototype.p_EnsureCapacity=function(t_minCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>";
	var t_oldCapacity=this.m_elements.length;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>";
	if(t_minCapacity>t_oldCapacity){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>";
		var t_newCapacity=((t_oldCapacity*3/2)|0)+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
		if(t_newCapacity<t_minCapacity){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>";
			t_newCapacity=t_minCapacity;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>";
		this.m_elements=resize_object_array(this.m_elements,t_newCapacity);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>";
		this.m_modCount+=1;
	}
	pop_err();
}
c_ArrayList7.prototype.p_Add5=function(t_o){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
	if(this.m_size+1>this.m_elements.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>";
		this.p_EnsureCapacity(this.m_size+1);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>";
	dbg_array(this.m_elements,this.m_size)[dbg_index]=(t_o)
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>";
	this.m_size+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>";
	this.m_modCount+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>";
	pop_err();
	return true;
}
c_ArrayList7.prototype.p_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>";
	var t_arr=new_object_array(this.m_size);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>";
	for(var t_i=0;t_i<this.m_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>";
		dbg_array(t_arr,t_i)[dbg_index]=dbg_array(this.m_elements,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>";
	pop_err();
	return t_arr;
}
function c_MyTileMap(){
	c_TileMap.call(this);
	this.implments={c_ITileMapPostLoad:1};
}
c_MyTileMap.prototype=extend_class(c_TileMap);
c_MyTileMap.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<9>";
	c_TileMap.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<9>";
	pop_err();
	return this;
}
c_MyTileMap.prototype.p_ConfigureLayer=function(t_tileLayer){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<12>";
	bb_graphics_SetAlpha(dbg_object(t_tileLayer).m_opacity);
	pop_err();
}
c_MyTileMap.prototype.p_DrawTile2=function(t_tileLayer,t_mapTile,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<16>";
	dbg_object(t_mapTile).m_image.p_DrawTile((t_x),(t_y),dbg_object(t_mapTile).m_id,0.0,1.0,1.0);
	pop_err();
}
function c_Bunny(){
	c_Sprite.call(this);
	this.m_bCount=0;
	this.m_flTimer=.0;
	this.m_direction=0;
	this.m_walkImagesTop=null;
	this.m_walkImagesBottom=null;
	this.m_walkImagesRight=null;
	this.m_walkImagesLeft=null;
	this.m_standImage=null;
	this.m_speed=4.0;
	this.m_flickering=false;
	this.m_health=3;
	this.m_isDead=false;
	this.m_bWidth=15;
	this.m_bHeight=25;
	this.m_beHeight=-9;
	this.m_beWidth=2;
}
c_Bunny.prototype=extend_class(c_Sprite);
c_Bunny.m_new=function(t_img,t_x,t_y,t_bAmount){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<34>";
	c_Sprite.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<35>";
	dbg_object(this).m_image=t_img;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<38>";
	dbg_object(this).m_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<39>";
	dbg_object(this).m_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<41>";
	this.m_bCount=t_bAmount;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<42>";
	this.m_flTimer=(bb_app_Millisecs());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<44>";
	this.p_SetHitBox(((-dbg_object(t_img).m_w2)|0),((-dbg_object(t_img).m_h2)|0),32,32);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<45>";
	dbg_object(this).m_visible=true;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<46>";
	this.m_direction=2;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<49>";
	this.m_walkImagesTop=dbg_object(bb_framework_diddyGame).m_images.p_FindSet("bunny_top",32,32,2,true,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<50>";
	this.m_walkImagesBottom=dbg_object(bb_framework_diddyGame).m_images.p_FindSet("bunny_bottom",32,32,2,true,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<51>";
	this.m_walkImagesRight=dbg_object(bb_framework_diddyGame).m_images.p_FindSet("bunny_right",32,32,2,true,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<52>";
	this.m_walkImagesLeft=dbg_object(bb_framework_diddyGame).m_images.p_FindSet("bunny_left",32,32,2,true,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<53>";
	this.m_standImage=dbg_object(bb_framework_diddyGame).m_images.p_Find("bunny_bottom");
	pop_err();
	return this;
}
c_Bunny.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<5>";
	c_Sprite.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<5>";
	pop_err();
	return this;
}
c_Bunny.prototype.p_CheckCollision=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<181>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<181>";
	var t_=bb_hunterClass_hunters.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<181>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<181>";
		var t_h=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<182>";
		if(t_h.p_GetXpos()+(t_h.p_GetWidth())>this.m_x && t_h.p_GetXpos()<this.m_x+15.0 && t_h.p_GetYpos()+(t_h.p_GetHeight())>this.m_y && t_h.p_GetYpos()<this.m_y+25.0 && this.m_flickering==false){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<183>";
			print("hit");
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<184>";
			this.m_health-=1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<185>";
			this.m_flickering=true;
		}
	}
	pop_err();
}
c_Bunny.prototype.p_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<57>";
	if((bb_input_KeyDown(87))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<58>";
		this.m_y-=this.m_speed;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<59>";
		this.m_direction=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<61>";
	if((bb_input_KeyDown(83))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<62>";
		this.m_y+=this.m_speed;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<63>";
		this.m_direction=2;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<65>";
	if((bb_input_KeyDown(65))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<66>";
		this.m_x-=this.m_speed;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<67>";
		this.m_direction=3;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<69>";
	if((bb_input_KeyDown(68))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<70>";
		this.m_x+=this.m_speed;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<71>";
		this.m_direction=4;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<75>";
	if(((bb_input_MouseHit(0))!=0) && this.m_bCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<76>";
		bb_bulletClass_CreateBullet(((bb_input_MouseX())|0),((bb_input_MouseY())|0),((this.m_x)|0),((this.m_y)|0));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<77>";
		this.m_bCount-=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<80>";
	if(this.m_x<0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<81>";
		this.m_x=0.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<83>";
	if(this.m_x>bb_framework_SCREEN_WIDTH-15.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<84>";
		this.m_x=bb_framework_SCREEN_WIDTH-15.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<86>";
	if(this.m_y<9.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<87>";
		this.m_y=9.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<89>";
	if(this.m_y>bb_framework_SCREEN_HEIGHT-25.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<90>";
		this.m_y=bb_framework_SCREEN_HEIGHT-25.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<94>";
	if(this.m_bCount<=0 && ((bb_input_KeyHit(82))!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<95>";
		this.m_bCount=10;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<99>";
	this.p_CheckCollision();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<102>";
	if(this.m_health<=0 && this.m_isDead==false){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<103>";
		this.m_isDead=true;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<106>";
	if(this.m_flickering==true){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<107>";
		if((bb_app_Millisecs())-this.m_flTimer>3000.0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<108>";
			this.m_flickering=false;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<109>";
			this.m_flTimer=(bb_app_Millisecs());
		}
	}
	pop_err();
}
c_Bunny.prototype.p_GetXpos=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<199>";
	var t_=((this.m_x)|0);
	pop_err();
	return t_;
}
c_Bunny.prototype.p_GetYpos=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<203>";
	var t_=((this.m_y)|0);
	pop_err();
	return t_;
}
c_Bunny.prototype.p_GetHealth=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<191>";
	pop_err();
	return this.m_health;
}
c_Bunny.prototype.p_Draw=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<115>";
	if(bb_mainClass_Debug){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<116>";
		this.p_DrawHitBox(0.0,0.0);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<119>";
	if(this.m_isDead==false){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<132>";
		if(this.m_direction==1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<133>";
			this.m_walkImagesTop.p_Draw2(this.m_x,this.m_y,0.0,1.0,1.0,0);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<134>";
			if(this.m_direction==2){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<135>";
				this.m_walkImagesBottom.p_Draw2(this.m_x,this.m_y,0.0,1.0,1.0,0);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<136>";
				if(this.m_direction==3){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<137>";
					this.m_walkImagesLeft.p_Draw2(this.m_x,this.m_y,0.0,1.0,1.0,0);
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<138>";
					if(this.m_direction==4){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<139>";
						this.m_walkImagesRight.p_Draw2(this.m_x,this.m_y,0.0,1.0,1.0,0);
					}
				}
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<144>";
		bb_graphics_SetColor(255.0,255.0,255.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<145>";
		var t_xdiff=((this.m_bCount*3/2)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<146>";
		if(this.m_bCount>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<147>";
			for(var t_x=0;t_x<=this.m_bCount-1;t_x=t_x+1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<148>";
				bb_graphics_DrawRect((20+t_x*5),bb_framework_SCREEN_HEIGHT-50.0,3.0,15.0);
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<151>";
		if(this.m_bCount<=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<152>";
			bb_graphics_SetColor(255.0,0.0,0.0);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<153>";
			bb_graphics_DrawText("Reload!",bb_framework_SCREEN_WIDTH/2.0-3.0,bb_framework_SCREEN_HEIGHT/2.0,0.0,0.0);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<157>";
		if(this.m_health>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<158>";
			for(var t_x2=0;t_x2<=this.m_health-1;t_x2=t_x2+1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<159>";
				bb_graphics_SetColor(0.0,255.0,0.0);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<160>";
				bb_graphics_DrawRect((550+t_x2*15),bb_framework_SCREEN_HEIGHT-50.0,15.0,15.0);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<167>";
	if(this.m_isDead){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<168>";
		bb_graphics_SetColor(255.0,0.0,0.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<169>";
		bb_graphics_DrawCircle(this.m_x,this.m_y+(this.m_bWidth*2),10.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<170>";
		bb_graphics_SetColor(255.0,255.0,255.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<171>";
		bb_graphics_DrawRect(this.m_x-(this.m_bWidth),this.m_y+(this.m_bWidth),(this.m_bHeight),(this.m_bWidth));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<172>";
		bb_graphics_DrawRect(this.m_x-(this.m_bWidth),this.m_y+(this.m_bWidth),(this.m_beHeight),(this.m_beWidth));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<173>";
		bb_graphics_DrawRect(this.m_x-(this.m_bWidth),this.m_y+(this.m_bWidth*2)-(this.m_beWidth),(this.m_beHeight),(this.m_beWidth));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<174>";
		bb_graphics_SetColor(255.0,0.0,0.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<175>";
		bb_graphics_DrawLine(this.m_x-((this.m_bWidth/2)|0),this.m_y+(this.m_bWidth*2),this.m_x-((this.m_bWidth/2)|0),this.m_y+(this.m_bWidth)+4.0);
	}
	pop_err();
}
function c_Bullet(){
	Object.call(this);
	this.m_sx=0.0;
	this.m_sy=0.0;
	this.m_tx=0.0;
	this.m_ty=0.0;
	this.m_cx=0.0;
	this.m_cy=0.0;
	this.m_dx=0.0;
	this.m_dy=0.0;
	this.m_speed=0.0;
	this.m_dt=null;
	this.m_radius=5.0;
}
c_Bullet.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<44>";
	pop_err();
	return this;
}
c_Bullet.prototype.p_Init4=function(t_x,t_y,t_xp,t_yp){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<58>";
	this.m_sx=(t_xp);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<59>";
	this.m_sy=(t_yp);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<60>";
	this.m_tx=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<61>";
	this.m_ty=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<62>";
	this.m_cx=(t_xp);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<63>";
	this.m_cy=(t_yp);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<64>";
	this.m_dx=this.m_tx-this.m_sx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<65>";
	this.m_dy=this.m_ty-this.m_sy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<66>";
	this.m_speed=(bb_bulletClass_GetDistance(((this.m_tx)|0),((this.m_ty)|0),((this.m_sx)|0),((this.m_sy)|0)))/4.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<67>";
	this.m_dt=c_DeltaTimer.m_new.call(new c_DeltaTimer,60.0);
	pop_err();
}
c_Bullet.prototype.p_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<71>";
	this.m_dt.p_UpdateDelta();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<72>";
	this.m_cx+=this.m_dx/this.m_speed*dbg_object(this.m_dt).m_delta;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<73>";
	this.m_cy+=this.m_dy/this.m_speed*dbg_object(this.m_dt).m_delta;
	pop_err();
}
c_Bullet.prototype.p_GetXpos=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<82>";
	pop_err();
	return this.m_cx;
}
c_Bullet.prototype.p_GetRadius=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<90>";
	pop_err();
	return this.m_radius;
}
c_Bullet.prototype.p_GetYpos=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<86>";
	pop_err();
	return this.m_cy;
}
c_Bullet.prototype.p_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<77>";
	bb_graphics_SetColor(255.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<78>";
	bb_graphics_DrawCircle(this.m_cx,this.m_cy,this.m_radius);
	pop_err();
}
function bb_bulletClass_GetDistance(t_tx,t_ty,t_sx,t_sy){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<38>";
	var t_diffx=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<38>";
	var t_diffy=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<39>";
	t_diffx=t_tx-t_sx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<40>";
	t_diffy=t_ty-t_sy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<41>";
	var t_=((Math.sqrt(t_diffx*t_diffx+t_diffy*t_diffy))|0);
	pop_err();
	return t_;
}
function c_List(){
	Object.call(this);
	this.m__head=(c_HeadNode.m_new.call(new c_HeadNode));
}
c_List.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_List.prototype.p_AddLast2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<108>";
	var t_=c_Node8.m_new.call(new c_Node8,this.m__head,dbg_object(this.m__head).m__pred,t_data);
	pop_err();
	return t_;
}
c_List.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	var t_=t_data;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	var t_2=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	while(t_2<t_.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
		var t_t=dbg_array(t_,t_2)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
		t_2=t_2+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<14>";
		this.p_AddLast2(t_t);
	}
	pop_err();
	return this;
}
c_List.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<186>";
	var t_=c_Enumerator2.m_new.call(new c_Enumerator2,this);
	pop_err();
	return t_;
}
c_List.prototype.p_Equals5=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<28>";
	var t_=t_lhs==t_rhs;
	pop_err();
	return t_;
}
c_List.prototype.p_RemoveEach=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<151>";
	var t_node=dbg_object(this.m__head).m__succ;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<152>";
	while(t_node!=this.m__head){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<153>";
		var t_succ=dbg_object(t_node).m__succ;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<154>";
		if(this.p_Equals5(dbg_object(t_node).m__data,t_value)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<154>";
			t_node.p_Remove2();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<155>";
		t_node=t_succ;
	}
	pop_err();
	return 0;
}
c_List.prototype.p_Remove=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<137>";
	this.p_RemoveEach(t_value);
	pop_err();
}
c_List.prototype.p_Clear=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<36>";
	dbg_object(this.m__head).m__succ=this.m__head;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<37>";
	dbg_object(this.m__head).m__pred=this.m__head;
	pop_err();
	return 0;
}
function c_Node8(){
	Object.call(this);
	this.m__succ=null;
	this.m__pred=null;
	this.m__data=null;
}
c_Node8.m_new=function(t_succ,t_pred,t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<261>";
	this.m__succ=t_succ;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<262>";
	this.m__pred=t_pred;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<263>";
	dbg_object(this.m__succ).m__pred=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<264>";
	dbg_object(this.m__pred).m__succ=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<265>";
	this.m__data=t_data;
	pop_err();
	return this;
}
c_Node8.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<258>";
	pop_err();
	return this;
}
c_Node8.prototype.p_Remove2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<274>";
	if(dbg_object(this.m__succ).m__pred!=this){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<274>";
		error("Illegal operation on removed node");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<276>";
	dbg_object(this.m__succ).m__pred=this.m__pred;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<277>";
	dbg_object(this.m__pred).m__succ=this.m__succ;
	pop_err();
	return 0;
}
function c_HeadNode(){
	c_Node8.call(this);
}
c_HeadNode.prototype=extend_class(c_Node8);
c_HeadNode.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<310>";
	c_Node8.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<311>";
	this.m__succ=(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<312>";
	this.m__pred=(this);
	pop_err();
	return this;
}
var bb_bulletClass_bullets=null;
function bb_bulletClass_CreateBullet(t_mx,t_my,t_xp,t_yp){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<25>";
	var t_b=c_Bullet.m_new.call(new c_Bullet);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<26>";
	t_b.p_Init4((t_mx),(t_my),t_xp,t_yp);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<27>";
	bb_bulletClass_bullets.p_AddLast2(t_b);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<28>";
	pop_err();
	return 1;
}
function c_Hunter(){
	c_Sprite.call(this);
	this.m_width=15;
	this.m_height=40;
	this.m_sx=.0;
	this.m_sy=.0;
	this.m_speed=.0;
	this.m_dt=null;
	this.m_hunterImage=null;
	this.m_dx=.0;
	this.m_dy=.0;
}
c_Hunter.prototype=extend_class(c_Sprite);
c_Hunter.prototype.p_GetXpos=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<97>";
	pop_err();
	return this.m_x;
}
c_Hunter.prototype.p_GetWidth=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<105>";
	pop_err();
	return this.m_width;
}
c_Hunter.prototype.p_GetYpos=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<101>";
	pop_err();
	return this.m_y;
}
c_Hunter.prototype.p_GetHeight=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<109>";
	pop_err();
	return this.m_height;
}
c_Hunter.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<45>";
	c_Sprite.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<46>";
	var t_position=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<47>";
	t_position=((bb_random_Rnd2(1.0,5.0))|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<48>";
	var t_1=t_position;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<49>";
	if(t_1==1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<50>";
		this.m_sx=bb_random_Rnd2(0.0,641.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<51>";
		this.m_sy=0.0;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<52>";
		if(t_1==2){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<53>";
			this.m_sx=bb_random_Rnd2(0.0,641.0);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<54>";
			this.m_sy=bb_framework_SCREEN_HEIGHT;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<55>";
			if(t_1==3){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<56>";
				this.m_sx=0.0;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<57>";
				this.m_sy=bb_random_Rnd2(0.0,481.0);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<58>";
				if(t_1==4){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<59>";
					this.m_sx=bb_framework_SCREEN_WIDTH;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<60>";
					this.m_sy=bb_random_Rnd2(0.0,481.0);
				}
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<62>";
	dbg_object(this).m_x=this.m_sx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<63>";
	dbg_object(this).m_y=this.m_sy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<64>";
	this.m_speed=bb_random_Rnd2(500.0,600.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<65>";
	this.m_dt=c_DeltaTimer.m_new.call(new c_DeltaTimer,60.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<67>";
	dbg_object(this).m_visible=true;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<69>";
	this.m_hunterImage=dbg_object(bb_framework_diddyGame).m_images.p_FindSet("hunter_full0",40,50,11,true,"");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<70>";
	this.p_SetFrame(0,11,125,false,true);
	pop_err();
	return this;
}
c_Hunter.prototype.p_CheckCollision=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<113>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<113>";
	var t_=bb_bulletClass_bullets.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<113>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<113>";
		var t_bullet=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<114>";
		if(t_bullet.p_GetXpos()+t_bullet.p_GetRadius()/2.0>this.m_x && t_bullet.p_GetXpos()-t_bullet.p_GetRadius()/2.0<this.m_x+(this.m_width) && t_bullet.p_GetYpos()+t_bullet.p_GetRadius()/2.0>this.m_y && t_bullet.p_GetYpos()-t_bullet.p_GetRadius()/2.0<this.m_y+(this.m_height)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<115>";
			bb_hunterClass_hunters.p_Remove3(this);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<116>";
			bb_bulletClass_bullets.p_Remove(t_bullet);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<117>";
			print("Hunter killed");
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<118>";
			dbg_object(bb_mainClass_gameScreen).m_score+=100;
		}
	}
	pop_err();
}
c_Hunter.prototype.p_Update3=function(t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<74>";
	this.m_dt.p_UpdateDelta();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<75>";
	this.m_dx=(t_tx)-this.m_sx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<76>";
	this.m_dy=(t_ty)-this.m_sy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<77>";
	this.m_x+=this.m_dx/this.m_speed*dbg_object(this.m_dt).m_delta;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<78>";
	this.m_y+=this.m_dy/this.m_speed*dbg_object(this.m_dt).m_delta;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<79>";
	this.p_CheckCollision();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<80>";
	this.p_UpdateAnimation();
	pop_err();
}
c_Hunter.prototype.p_Draw=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<85>";
	this.m_hunterImage.p_Draw2(this.m_x,this.m_y,0.0,1.0,1.0,0);
	pop_err();
}
function c_List2(){
	Object.call(this);
	this.m__head=(c_HeadNode2.m_new.call(new c_HeadNode2));
}
c_List2.m_new=function(){
	push_err();
	pop_err();
	return this;
}
c_List2.prototype.p_AddLast3=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<108>";
	var t_=c_Node9.m_new.call(new c_Node9,this.m__head,dbg_object(this.m__head).m__pred,t_data);
	pop_err();
	return t_;
}
c_List2.m_new2=function(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	var t_=t_data;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	var t_2=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
	while(t_2<t_.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
		var t_t=dbg_array(t_,t_2)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>";
		t_2=t_2+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<14>";
		this.p_AddLast3(t_t);
	}
	pop_err();
	return this;
}
c_List2.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<186>";
	var t_=c_Enumerator.m_new.call(new c_Enumerator,this);
	pop_err();
	return t_;
}
c_List2.prototype.p_Equals6=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<28>";
	var t_=t_lhs==t_rhs;
	pop_err();
	return t_;
}
c_List2.prototype.p_RemoveEach2=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<151>";
	var t_node=dbg_object(this.m__head).m__succ;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<152>";
	while(t_node!=this.m__head){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<153>";
		var t_succ=dbg_object(t_node).m__succ;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<154>";
		if(this.p_Equals6(dbg_object(t_node).m__data,t_value)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<154>";
			t_node.p_Remove2();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<155>";
		t_node=t_succ;
	}
	pop_err();
	return 0;
}
c_List2.prototype.p_Remove3=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<137>";
	this.p_RemoveEach2(t_value);
	pop_err();
}
c_List2.prototype.p_Clear=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<36>";
	dbg_object(this.m__head).m__succ=this.m__head;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<37>";
	dbg_object(this.m__head).m__pred=this.m__head;
	pop_err();
	return 0;
}
function c_Node9(){
	Object.call(this);
	this.m__succ=null;
	this.m__pred=null;
	this.m__data=null;
}
c_Node9.m_new=function(t_succ,t_pred,t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<261>";
	this.m__succ=t_succ;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<262>";
	this.m__pred=t_pred;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<263>";
	dbg_object(this.m__succ).m__pred=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<264>";
	dbg_object(this.m__pred).m__succ=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<265>";
	this.m__data=t_data;
	pop_err();
	return this;
}
c_Node9.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<258>";
	pop_err();
	return this;
}
c_Node9.prototype.p_Remove2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<274>";
	if(dbg_object(this.m__succ).m__pred!=this){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<274>";
		error("Illegal operation on removed node");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<276>";
	dbg_object(this.m__succ).m__pred=this.m__pred;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<277>";
	dbg_object(this.m__pred).m__succ=this.m__succ;
	pop_err();
	return 0;
}
function c_HeadNode2(){
	c_Node9.call(this);
}
c_HeadNode2.prototype=extend_class(c_Node9);
c_HeadNode2.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<310>";
	c_Node9.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<311>";
	this.m__succ=(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<312>";
	this.m__pred=(this);
	pop_err();
	return this;
}
var bb_hunterClass_hunters=null;
function c_Enumerator(){
	Object.call(this);
	this.m__list=null;
	this.m__curr=null;
}
c_Enumerator.m_new=function(t_list){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<326>";
	this.m__list=t_list;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<327>";
	this.m__curr=dbg_object(dbg_object(t_list).m__head).m__succ;
	pop_err();
	return this;
}
c_Enumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<323>";
	pop_err();
	return this;
}
c_Enumerator.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<331>";
	while(dbg_object(dbg_object(this.m__curr).m__succ).m__pred!=this.m__curr){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<332>";
		this.m__curr=dbg_object(this.m__curr).m__succ;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<334>";
	var t_=this.m__curr!=dbg_object(this.m__list).m__head;
	pop_err();
	return t_;
}
c_Enumerator.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<338>";
	var t_data=dbg_object(this.m__curr).m__data;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<339>";
	this.m__curr=dbg_object(this.m__curr).m__succ;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<340>";
	pop_err();
	return t_data;
}
function c_Enumerator2(){
	Object.call(this);
	this.m__list=null;
	this.m__curr=null;
}
c_Enumerator2.m_new=function(t_list){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<326>";
	this.m__list=t_list;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<327>";
	this.m__curr=dbg_object(dbg_object(t_list).m__head).m__succ;
	pop_err();
	return this;
}
c_Enumerator2.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<323>";
	pop_err();
	return this;
}
c_Enumerator2.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<331>";
	while(dbg_object(dbg_object(this.m__curr).m__succ).m__pred!=this.m__curr){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<332>";
		this.m__curr=dbg_object(this.m__curr).m__succ;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<334>";
	var t_=this.m__curr!=dbg_object(this.m__list).m__head;
	pop_err();
	return t_;
}
c_Enumerator2.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<338>";
	var t_data=dbg_object(this.m__curr).m__data;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<339>";
	this.m__curr=dbg_object(this.m__curr).m__succ;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<340>";
	pop_err();
	return t_data;
}
function bb_bulletClass_UpdateBullets(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<9>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<9>";
	var t_=bb_bulletClass_bullets.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<9>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<9>";
		var t_bullet=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<10>";
		t_bullet.p_Update2();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<12>";
	pop_err();
	return 1;
}
function bb_random_Rnd(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<21>";
	bb_random_Seed=bb_random_Seed*1664525+1013904223|0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<22>";
	var t_=(bb_random_Seed>>8&16777215)/16777216.0;
	pop_err();
	return t_;
}
function bb_random_Rnd2(t_low,t_high){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<30>";
	var t_=bb_random_Rnd3(t_high-t_low)+t_low;
	pop_err();
	return t_;
}
function bb_random_Rnd3(t_range){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<26>";
	var t_=bb_random_Rnd()*t_range;
	pop_err();
	return t_;
}
function bb_hunterClass_CreateHunter(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<8>";
	var t_h=c_Hunter.m_new.call(new c_Hunter);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<10>";
	bb_hunterClass_hunters.p_AddLast3(t_h);
	pop_err();
}
function bb_hunterClass_UpdateHunter(t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<14>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<14>";
	var t_=bb_hunterClass_hunters.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<14>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<14>";
		var t_hunter=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<15>";
		t_hunter.p_Update3(((t_tx)|0),((t_ty)|0));
	}
	pop_err();
}
function bb_bulletClass_RemoveBullets(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<33>";
	bb_bulletClass_bullets.p_Clear();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<34>";
	pop_err();
	return 1;
}
function bb_hunterClass_RemoveHunter(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<26>";
	bb_hunterClass_hunters.p_Clear();
	pop_err();
}
function c_IEnumerator5(){
	Object.call(this);
}
c_IEnumerator5.prototype.p_HasNext=function(){
}
c_IEnumerator5.prototype.p_NextObject=function(){
}
c_IEnumerator5.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
var bb_mainClass_Debug=false;
function bb_graphics_DrawLine(t_x1,t_y1,t_x2,t_y2){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<399>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<401>";
	bb_graphics_context.p_Validate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<402>";
	bb_graphics_renderDevice.DrawLine(t_x1,t_y1,t_x2,t_y2);
	pop_err();
	return 0;
}
function bb_functions_DrawRectOutline(t_x,t_y,t_w,t_h){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<97>";
	t_w-=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<98>";
	t_h-=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<99>";
	bb_graphics_DrawLine((t_x),(t_y),(t_x+t_w),(t_y));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<100>";
	bb_graphics_DrawLine((t_x+t_w),(t_y),(t_x+t_w),(t_y+t_h));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<101>";
	bb_graphics_DrawLine((t_x+t_w),(t_y+t_h),(t_x),(t_y+t_h));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<102>";
	bb_graphics_DrawLine((t_x),(t_y+t_h),(t_x),(t_y));
	pop_err();
}
function bb_graphics_DrawCircle(t_x,t_y,t_r){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<415>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<417>";
	bb_graphics_context.p_Validate();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<418>";
	bb_graphics_renderDevice.DrawOval(t_x-t_r,t_y-t_r,t_r*2.0,t_r*2.0);
	pop_err();
	return 0;
}
function bb_hunterClass_RenderHunter(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<20>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<20>";
	var t_=bb_hunterClass_hunters.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<20>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<20>";
		var t_hunter=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<21>";
		t_hunter.p_Draw();
	}
	pop_err();
}
function bb_bulletClass_RenderBullets(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<17>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<17>";
	var t_=bb_bulletClass_bullets.p_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<17>";
	while(t_.p_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<17>";
		var t_bullet=t_.p_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<18>";
		t_bullet.p_Render();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<20>";
	pop_err();
	return 1;
}
function c_MapValues(){
	Object.call(this);
	this.m_map=null;
}
c_MapValues.m_new=function(t_map){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<519>";
	dbg_object(this).m_map=t_map;
	pop_err();
	return this;
}
c_MapValues.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<516>";
	pop_err();
	return this;
}
c_MapValues.prototype.p_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<523>";
	var t_=c_ValueEnumerator.m_new.call(new c_ValueEnumerator,this.m_map.p_FirstNode());
	pop_err();
	return t_;
}
function c_ValueEnumerator(){
	Object.call(this);
	this.m_node=null;
}
c_ValueEnumerator.m_new=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<481>";
	dbg_object(this).m_node=t_node;
	pop_err();
	return this;
}
c_ValueEnumerator.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<478>";
	pop_err();
	return this;
}
c_ValueEnumerator.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<485>";
	var t_=this.m_node!=null;
	pop_err();
	return t_;
}
c_ValueEnumerator.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<489>";
	var t_t=this.m_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<490>";
	this.m_node=this.m_node.p_NextNode();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<491>";
	pop_err();
	return dbg_object(t_t).m_value;
}
function c_IEnumerator6(){
	Object.call(this);
}
c_IEnumerator6.prototype.p_HasNext=function(){
}
c_IEnumerator6.prototype.p_NextObject=function(){
}
c_IEnumerator6.m_new=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
function c_ListEnumerator5(){
	c_IEnumerator6.call(this);
	this.m_lst=null;
	this.m_expectedModCount=0;
	this.m_index=0;
	this.m_lastIndex=0;
}
c_ListEnumerator5.prototype=extend_class(c_IEnumerator6);
c_ListEnumerator5.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	c_IEnumerator6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).m_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.m_expectedModCount=dbg_object(t_lst).m_modCount;
	pop_err();
	return this;
}
c_ListEnumerator5.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	c_IEnumerator6.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
c_ListEnumerator5.prototype.p_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.m_lst).m_modCount!=this.m_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw c_ConcurrentModificationException.m_new.call(new c_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
c_ListEnumerator5.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.m_index<this.m_lst.p_Size();
	pop_err();
	return t_;
}
c_ListEnumerator5.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.m_lst.p_Get2(this.m_lastIndex);
	pop_err();
	return t_;
}
function c_ArrayListEnumerator5(){
	c_ListEnumerator5.call(this);
	this.m_alst=null;
}
c_ArrayListEnumerator5.prototype=extend_class(c_ListEnumerator5);
c_ArrayListEnumerator5.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	c_ListEnumerator5.m_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).m_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.m_expectedModCount=dbg_object(this.m_alst).m_modCount;
	pop_err();
	return this;
}
c_ArrayListEnumerator5.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	c_ListEnumerator5.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
c_ArrayListEnumerator5.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.m_index<dbg_object(this.m_alst).m_size;
	pop_err();
	return t_;
}
c_ArrayListEnumerator5.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.m_alst).m_elements,this.m_lastIndex)[dbg_index]),c_TileMapTile);
	pop_err();
	return t_;
}
function c_ListEnumerator6(){
	c_IEnumerator5.call(this);
	this.m_lst=null;
	this.m_expectedModCount=0;
	this.m_index=0;
	this.m_lastIndex=0;
}
c_ListEnumerator6.prototype=extend_class(c_IEnumerator5);
c_ListEnumerator6.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	c_IEnumerator5.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).m_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.m_expectedModCount=dbg_object(t_lst).m_modCount;
	pop_err();
	return this;
}
c_ListEnumerator6.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	c_IEnumerator5.m_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
c_ListEnumerator6.prototype.p_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.m_lst).m_modCount!=this.m_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw c_ConcurrentModificationException.m_new.call(new c_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
c_ListEnumerator6.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.m_index<this.m_lst.p_Size();
	pop_err();
	return t_;
}
c_ListEnumerator6.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.m_lst.p_Get2(this.m_lastIndex);
	pop_err();
	return t_;
}
function c_ArrayListEnumerator6(){
	c_ListEnumerator6.call(this);
	this.m_alst=null;
}
c_ArrayListEnumerator6.prototype=extend_class(c_ListEnumerator6);
c_ArrayListEnumerator6.m_new=function(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	c_ListEnumerator6.m_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).m_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.m_expectedModCount=dbg_object(this.m_alst).m_modCount;
	pop_err();
	return this;
}
c_ArrayListEnumerator6.m_new2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	c_ListEnumerator6.m_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
c_ArrayListEnumerator6.prototype.p_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.m_index<dbg_object(this.m_alst).m_size;
	pop_err();
	return t_;
}
c_ArrayListEnumerator6.prototype.p_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.p_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.m_lastIndex=this.m_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.m_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.m_alst).m_elements,this.m_lastIndex)[dbg_index]),c_TileMapLayer);
	pop_err();
	return t_;
}
function bbInit(){
	bb_reflection__classesMap=null;
	bb_reflection__classes=[];
	bb_reflection__getClass=null;
	bb_reflection__boolClass=null;
	bb_reflection__intClass=null;
	bb_reflection__floatClass=null;
	bb_reflection__stringClass=null;
	bb_reflection__functions=[];
	bb_reflection__init=bb_reflection___init();
	bb_app__app=null;
	bb_app__delegate=null;
	bb_app__game=BBGame.Game();
	bb_framework_diddyGame=null;
	bb_reflection__unknownClass=(c_UnknownClass.m_new.call(new c_UnknownClass));
	bb_graphics_device=null;
	bb_graphics_context=c_GraphicsContext.m_new.call(new c_GraphicsContext);
	c_Image.m_DefaultFlags=0;
	bb_audio_device=null;
	bb_input_device=null;
	bb_graphics_renderDevice=null;
	bb_framework_DEVICE_WIDTH=.0;
	bb_framework_DEVICE_HEIGHT=.0;
	bb_framework_SCREEN_WIDTH=.0;
	bb_framework_SCREEN_HEIGHT=.0;
	bb_framework_SCREEN_WIDTH2=.0;
	bb_framework_SCREEN_HEIGHT2=.0;
	bb_framework_SCREENX_RATIO=1.0;
	bb_framework_SCREENY_RATIO=1.0;
	bb_random_Seed=1234;
	bb_framework_dt=null;
	bb_app__updateRate=0;
	c_Particle.m_MAX_PARTICLES=800;
	c_Particle.m_particles=new_object_array(c_Particle.m_MAX_PARTICLES);
	c_FPSCounter.m_startTime=0;
	c_FPSCounter.m_fpsCount=0;
	c_FPSCounter.m_totalFPS=0;
	c_SoundPlayer.m_channel=0;
	c_SoundBank.m_path="sounds/";
	bb_framework_defaultFadeTime=600.0;
	c_JsonString.m__null=c_JsonString.m_new.call(new c_JsonString,"");
	c_JsonNumber.m__zero=c_JsonNumber.m_new.call(new c_JsonNumber,"0");
	c_JsonBool.m__true=c_JsonBool.m_new.call(new c_JsonBool,true);
	c_JsonBool.m__false=c_JsonBool.m_new.call(new c_JsonBool,false);
	c_JsonNull.m__instance=c_JsonNull.m_new.call(new c_JsonNull);
	bb_mainClass_titleScreen=null;
	bb_mainClass_gameScreen=null;
	bb_base64_BASE64_ARRAY=[];
	bb_bulletClass_bullets=c_List.m_new.call(new c_List);
	bb_hunterClass_hunters=c_List2.m_new.call(new c_List2);
	bb_mainClass_Debug=true;
}
//${TRANSCODE_END}
