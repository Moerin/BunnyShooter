
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
CFG_CONFIG="debug";
CFG_HOST="winnt";
CFG_IMAGE_FILES="*.png|*.jpg";
CFG_LANG="js";
CFG_MOJO_AUTO_SUSPEND_ENABLED="false";
CFG_MUSIC_FILES="*.wav|*.ogg|*.mp3|*.m4a";
CFG_OPENGL_GLES20_ENABLED="false";
CFG_PARSER_FUNC_ATTRS="0";
CFG_REFLECTION_FILTER="diddy.exception";
CFG_SOUND_FILES="*.wav|*.ogg|*.mp3|*.m4a";
CFG_TARGET="html5";
CFG_TEXT_FILES="*.txt|*.xml|*.json";
//${CONFIG_END}

//${METADATA_BEGIN}
var META_DATA="[mojo_font.png];type=image/png;width=864;height=13;\n";
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
	if( game_console ){
		game_console.value+=str+"\n";
		game_console.scrollTop = game_console.scrollHeight - game_console.clientHeight;
	}
	if( window.console!=undefined ){
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
	print( str );
}

function debugStop(){
	error( "STOP" );
}

function dbg_object( obj ){
	if( obj ) return obj;
	error( "Null object access" );
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

function string_starts_with( str,substr ){
	return substr.length<=str.length && str.slice(0,substr.length)==substr;
}

function string_ends_with( str,substr ){
	return substr.length<=str.length && str.slice(str.length-substr.length,str.length)==substr;
}

function string_from_chars( chars ){
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

// HTML5 mojo runtime.
//
// Copyright 2011 Mark Sibly, all rights reserved.
// No warranty implied; use at your own risk.

var gl=null;	//global WebGL context - a bit rude!

KEY_LMB=1;
KEY_RMB=2;
KEY_MMB=3;
KEY_TOUCH0=0x180;

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
	case 8:
	case 9:
	case 13:
	case 27:
	case 32:
		return key;
	case 33:
	case 34:
	case 35:
	case 36:
	case 37:
	case 38:
	case 39:
	case 40:
	case 45:
		return key | 0x10000;
	case 46:
		return 127;
	}
	return 0;
}

//***** gxtkApp class *****

function gxtkApp(){

	if( typeof( CFG_OPENGL_GLES20_ENABLED )!="undefined" && CFG_OPENGL_GLES20_ENABLED=="true" ){
		this.gl=game_canvas.getContext( "webgl" );
		if( !this.gl ) this.gl=game_canvas.getContext( "experimental-webgl" );
	}else{
		this.gl=null;
	}

	this.graphics=new gxtkGraphics( this,game_canvas );
	this.input=new gxtkInput( this );
	this.audio=new gxtkAudio( this );

	this.loading=0;
	this.maxloading=0;

	this.updateRate=0;
	this.startMillis=(new Date).getTime();
	
	this.dead=false;
	this.suspended=false;
	
	var app=this;
	var canvas=game_canvas;
	
	function gxtkMain(){
	
		var input=app.input;
	
		canvas.onkeydown=function( e ){
			input.OnKeyDown( e.keyCode );
			var chr=keyToChar( e.keyCode );
			if( chr ) input.PutChar( chr );
			if( e.keyCode<48 || (e.keyCode>111 && e.keyCode<122) ) eatEvent( e );
		}

		canvas.onkeyup=function( e ){
			input.OnKeyUp( e.keyCode );
		}

		canvas.onkeypress=function( e ){
			if( e.charCode ){
				input.PutChar( e.charCode );
			}else if( e.which ){
				input.PutChar( e.which );
			}
		}

		canvas.onmousedown=function( e ){
			switch( e.button ){
			case 0:input.OnKeyDown( KEY_LMB );break;
			case 1:input.OnKeyDown( KEY_MMB );break;
			case 2:input.OnKeyDown( KEY_RMB );break;
			}
			eatEvent( e );
		}
		
		canvas.onmouseup=function( e ){
			switch( e.button ){
			case 0:input.OnKeyUp( KEY_LMB );break;
			case 1:input.OnKeyUp( KEY_MMB );break;
			case 2:input.OnKeyUp( KEY_RMB );break;
			}
			eatEvent( e );
		}
		
		canvas.onmouseout=function( e ){
			input.OnKeyUp( KEY_LMB );
			input.OnKeyUp( KEY_MMB );
			input.OnKeyUp( KEY_RMB );
			eatEvent( e );
		}

		canvas.onmousemove=function( e ){
			var x=e.clientX+document.body.scrollLeft;
			var y=e.clientY+document.body.scrollTop;
			var c=canvas;
			while( c ){
				x-=c.offsetLeft;
				y-=c.offsetTop;
				c=c.offsetParent;
			}
			input.OnMouseMove( x,y );
			eatEvent( e );
		}

		canvas.onfocus=function( e ){
			if( CFG_MOJO_AUTO_SUSPEND_ENABLED=="true" ){
				app.InvokeOnResume();
			}
		}
		
		canvas.onblur=function( e ){
			if( CFG_MOJO_AUTO_SUSPEND_ENABLED=="true" ){
				app.InvokeOnSuspend();
			}
		}
		
		canvas.ontouchstart=function( e ){
			for( var i=0;i<e.changedTouches.length;++i ){
				var touch=e.changedTouches[i];
				var x=touch.pageX;
				var y=touch.pageY;
				var c=canvas;
				while( c ){
					x-=c.offsetLeft;
					y-=c.offsetTop;
					c=c.offsetParent;
				}
				input.OnTouchStart( touch.identifier,x,y );
			}
			eatEvent( e );
		}
		
		canvas.ontouchmove=function( e ){
			for( var i=0;i<e.changedTouches.length;++i ){
				var touch=e.changedTouches[i];
				var x=touch.pageX;
				var y=touch.pageY;
				var c=canvas;
				while( c ){
					x-=c.offsetLeft;
					y-=c.offsetTop;
					c=c.offsetParent;
				}
				input.OnTouchMove( touch.identifier,x,y );
			}
			eatEvent( e );
		}
		
		canvas.ontouchend=function( e ){
			for( var i=0;i<e.changedTouches.length;++i ){
				input.OnTouchEnd( e.changedTouches[i].identifier );
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
			input.OnDeviceMotion( x,y,tz );
			eatEvent( e );
		}

		canvas.focus();

		app.InvokeOnCreate();
		app.InvokeOnRender();
	}

	game_runner=gxtkMain;
}

var timerSeq=0;

gxtkApp.prototype.SetFrameRate=function( fps ){

	var seq=++timerSeq;
	
	if( !fps ) return;
	
	var app=this;
	var updatePeriod=1000.0/fps;
	var nextUpdate=(new Date).getTime()+updatePeriod;
	
	function timeElapsed(){
		if( seq!=timerSeq ) return;

		var time;		
		var updates=0;

		for(;;){
			nextUpdate+=updatePeriod;

			app.InvokeOnUpdate();
			if( seq!=timerSeq ) return;
			
			if( nextUpdate>(new Date).getTime() ) break;
			
			if( ++updates==7 ){
				nextUpdate=(new Date).getTime();
				break;
			}
		}
		app.InvokeOnRender();
		if( seq!=timerSeq ) return;
			
		var delay=nextUpdate-(new Date).getTime();
		setTimeout( timeElapsed,delay>0 ? delay : 0 );
	}
	
	setTimeout( timeElapsed,updatePeriod );
}

gxtkApp.prototype.IncLoading=function(){
	++this.loading;
	if( this.loading>this.maxloading ) this.maxloading=this.loading;
	if( this.loading==1 ) this.SetFrameRate( 0 );
}

gxtkApp.prototype.DecLoading=function(){
	--this.loading;
	if( this.loading!=0 ) return;
	this.maxloading=0;
	this.SetFrameRate( this.updateRate );
}

gxtkApp.prototype.GetMetaData=function( path,key ){
	return getMetaData( path,key );
}

gxtkApp.prototype.Die=function( err ){
	this.dead=true;
	this.audio.OnSuspend();
	alertError( err );
}

gxtkApp.prototype.InvokeOnCreate=function(){
	if( this.dead ) return;
	
	try{
		gl=this.gl;
		this.OnCreate();
		gl=null;
	}catch( ex ){
		this.Die( ex );
	}
}

gxtkApp.prototype.InvokeOnUpdate=function(){
	if( this.dead || this.suspended || !this.updateRate || this.loading ) return;
	
	try{
		gl=this.gl;
		this.input.BeginUpdate();
		this.OnUpdate();		
		this.input.EndUpdate();
		gl=null;
	}catch( ex ){
		this.Die( ex );
	}
}

gxtkApp.prototype.InvokeOnSuspend=function(){
	if( this.dead || this.suspended ) return;
	
	try{
		gl=this.gl;
		this.suspended=true;
		this.OnSuspend();
		this.audio.OnSuspend();
		gl=null;
	}catch( ex ){
		this.Die( ex );
	}
}

gxtkApp.prototype.InvokeOnResume=function(){
	if( this.dead || !this.suspended ) return;
	
	try{
		gl=this.gl;
		this.audio.OnResume();
		this.OnResume();
		this.suspended=false;
		gl=null;
	}catch( ex ){
		this.Die( ex );
	}
}

gxtkApp.prototype.InvokeOnRender=function(){
	if( this.dead || this.suspended ) return;
	
	try{
		gl=this.gl;
		this.graphics.BeginRender();
		if( this.loading ){
			this.OnLoading();
		}else{
			this.OnRender();
		}
		this.graphics.EndRender();
		gl=null;
	}catch( ex ){
		this.Die( ex );
	}
}

//***** GXTK API *****

gxtkApp.prototype.GraphicsDevice=function(){
	return this.graphics;
}

gxtkApp.prototype.InputDevice=function(){
	return this.input;
}

gxtkApp.prototype.AudioDevice=function(){
	return this.audio;
}

gxtkApp.prototype.AppTitle=function(){
	return document.URL;
}

gxtkApp.prototype.LoadState=function(){
	var state=localStorage.getItem( ".mojostate@"+document.URL );
	if( state ) return state;
	return "";
}

gxtkApp.prototype.SaveState=function( state ){
	localStorage.setItem( ".mojostate@"+document.URL,state );
}

gxtkApp.prototype.LoadString=function( path ){
	return loadString( path );
}

gxtkApp.prototype.SetUpdateRate=function( fps ){
	this.updateRate=fps;
	
	if( !this.loading ) this.SetFrameRate( fps );
}

gxtkApp.prototype.MilliSecs=function(){
	return ((new Date).getTime()-this.startMillis)|0;
}

gxtkApp.prototype.Loading=function(){
	return this.loading;
}

gxtkApp.prototype.OnCreate=function(){
}

gxtkApp.prototype.OnUpdate=function(){
}

gxtkApp.prototype.OnSuspend=function(){
}

gxtkApp.prototype.OnResume=function(){
}

gxtkApp.prototype.OnRender=function(){
}

gxtkApp.prototype.OnLoading=function(){
}

//***** gxtkGraphics class *****

function gxtkGraphics( app,canvas ){
	this.app=app;
	this.canvas=canvas;
	this.gc=canvas.getContext( '2d' );
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
	if( this.gc ) this.gc.save();
}

gxtkGraphics.prototype.EndRender=function(){
	if( this.gc ) this.gc.restore();
}

gxtkGraphics.prototype.Mode=function(){
	if( this.gc ) return 1;
	return 0;
}

gxtkGraphics.prototype.Width=function(){
	return this.canvas.width;
}

gxtkGraphics.prototype.Height=function(){
	return this.canvas.height;
}

gxtkGraphics.prototype.LoadSurface=function( path ){
	var app=this.app;
	
	function onloadfun(){
		app.DecLoading();
	}

	app.IncLoading();

	var image=loadImage( path,onloadfun );
	if( image ) return new gxtkSurface( image,this );

	app.DecLoading();
	return null;
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
	if( verts.length<6 ) return;
	this.gc.beginPath();
	this.gc.moveTo( verts[0],verts[1] );
	for( var i=2;i<verts.length;i+=2 ){
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

	if( !this.tmpGC ){
		this.tmpCanvas=document.createElement( "canvas" );
		this.tmpGC=this.tmpCanvas.getContext( "2d" );
		this.tmpGC.globalCompositeOperation="copy";
	}

	if( sw>this.tmpCanvas.width || sh>this.tmpCanvas.height ){
		this.tmpCanvas.width=Math.max( sw,this.tmpCanvas.width );
		this.tmpCanvas.height=Math.max( sh,this.tmpCanvas.height );
	}
	
	this.tmpGC.drawImage( image,sx,sy,sw,sh,0,0,sw,sh );
	
	var imgData=this.tmpGC.getImageData( 0,0,sw,sh );
	
	var p=imgData.data,sz=sw*sh*4,i;
	
	for( i=0;i<sz;i+=4 ){
		p[i]=p[i]*this.r/255;
		p[i+1]=p[i+1]*this.g/255;
		p[i+2]=p[i+2]*this.b/255;
	}
	
	this.tmpGC.putImageData( imgData,0,0 );
	
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

//***** Class gxtkInput *****

function gxtkInput( app ){
	this.app=app;
	this.keyStates=new Array( 512 );
	this.charQueue=new Array( 32 );
	this.charPut=0;
	this.charGet=0;
	this.mouseX=0;
	this.mouseY=0;
	this.joyX=0;
	this.joyY=0;
	this.joyZ=0;
	this.touchIds=new Array( 32 );
	this.touchXs=new Array( 32 );
	this.touchYs=new Array( 32 );
	this.accelX=0;
	this.accelY=0;
	this.accelZ=0;
	
	var i;
	
	for( i=0;i<512;++i ){
		this.keyStates[i]=0;
	}
	
	for( i=0;i<32;++i ){
		this.touchIds[i]=-1;
		this.touchXs[i]=0;
		this.touchYs[i]=0;
	}
}

gxtkInput.prototype.BeginUpdate=function(){
}

gxtkInput.prototype.EndUpdate=function(){
	for( var i=0;i<512;++i ){
		this.keyStates[i]&=0x100;
	}
	this.charGet=0;
	this.charPut=0;
}

gxtkInput.prototype.OnKeyDown=function( key ){
	if( (this.keyStates[key]&0x100)==0 ){
		this.keyStates[key]|=0x100;
		++this.keyStates[key];
		//
		if( key==KEY_LMB ){
			this.keyStates[KEY_TOUCH0]|=0x100;
			++this.keyStates[KEY_TOUCH0];
		}else if( key==KEY_TOUCH0 ){
			this.keyStates[KEY_LMB]|=0x100;
			++this.keyStates[KEY_LMB];
		}
		//
	}
}

gxtkInput.prototype.OnKeyUp=function( key ){
	this.keyStates[key]&=0xff;
	//
	if( key==KEY_LMB ){
		this.keyStates[KEY_TOUCH0]&=0xff;
	}else if( key==KEY_TOUCH0 ){
		this.keyStates[KEY_LMB]&=0xff;
	}
	//
}

gxtkInput.prototype.PutChar=function( chr ){
	if( this.charPut-this.charGet<32 ){
		this.charQueue[this.charPut & 31]=chr;
		this.charPut+=1;
	}
}

gxtkInput.prototype.OnMouseMove=function( x,y ){
	this.mouseX=x;
	this.mouseY=y;
	this.touchXs[0]=x;
	this.touchYs[0]=y;
}

gxtkInput.prototype.OnTouchStart=function( id,x,y ){
	for( var i=0;i<32;++i ){
		if( this.touchIds[i]==-1 ){
			this.touchIds[i]=id;
			this.touchXs[i]=x;
			this.touchYs[i]=y;
			this.OnKeyDown( KEY_TOUCH0+i );
			return;
		} 
	}
}

gxtkInput.prototype.OnTouchMove=function( id,x,y ){
	for( var i=0;i<32;++i ){
		if( this.touchIds[i]==id ){
			this.touchXs[i]=x;
			this.touchYs[i]=y;
			if( i==0 ){
				this.mouseX=x;
				this.mouseY=y;
			}
			return;
		}
	}
}

gxtkInput.prototype.OnTouchEnd=function( id ){
	for( var i=0;i<32;++i ){
		if( this.touchIds[i]==id ){
			this.touchIds[i]=-1;
			this.OnKeyUp( KEY_TOUCH0+i );
			return;
		}
	}
}

gxtkInput.prototype.OnDeviceMotion=function( x,y,z ){
	this.accelX=x;
	this.accelY=y;
	this.accelZ=z;
}

//***** GXTK API *****

gxtkInput.prototype.SetKeyboardEnabled=function( enabled ){
	return 0;
}

gxtkInput.prototype.KeyDown=function( key ){
	if( key>0 && key<512 ){
		return this.keyStates[key] >> 8;
	}
	return 0;
}

gxtkInput.prototype.KeyHit=function( key ){
	if( key>0 && key<512 ){
		return this.keyStates[key] & 0xff;
	}
	return 0;
}

gxtkInput.prototype.GetChar=function(){
	if( this.charPut!=this.charGet ){
		var chr=this.charQueue[this.charGet & 31];
		this.charGet+=1;
		return chr;
	}
	return 0;
}

gxtkInput.prototype.MouseX=function(){
	return this.mouseX;
}

gxtkInput.prototype.MouseY=function(){
	return this.mouseY;
}

gxtkInput.prototype.JoyX=function( index ){
	return this.joyX;
}

gxtkInput.prototype.JoyY=function( index ){
	return this.joyY;
}

gxtkInput.prototype.JoyZ=function( index ){
	return this.joyZ;
}

gxtkInput.prototype.TouchX=function( index ){
	return this.touchXs[index];
}

gxtkInput.prototype.TouchY=function( index ){
	return this.touchYs[index];
}

gxtkInput.prototype.AccelX=function(){
	return this.accelX;
}

gxtkInput.prototype.AccelY=function(){
	return this.accelY;
}

gxtkInput.prototype.AccelZ=function(){
	return this.accelZ;
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
function gxtkAudio( app ){
	this.app=app;
	this.okay=typeof(Audio)!="undefined";
	this.nextchan=0;
	this.music=null;
	this.channels=new Array(33);
	for( var i=0;i<33;++i ){
		this.channels[i]=new gxtkChannel();
	}
}

gxtkAudio.prototype.OnSuspend=function(){
	var i;
	for( i=0;i<33;++i ){
		var chan=this.channels[i];
		if( chan.state==1 ) chan.audio.pause();
	}
}

gxtkAudio.prototype.OnResume=function(){
	var i;
	for( i=0;i<33;++i ){
		var chan=this.channels[i];
		if( chan.state==1 ) chan.audio.play();
	}
}

gxtkAudio.prototype.LoadSample=function( path ){
	var audio=loadAudio( path );
	if( audio ) return new gxtkSample( audio );
	return null;
}

gxtkAudio.prototype.PlaySample=function( sample,channel,flags ){
	if( !this.okay ) return;

	var chan=this.channels[channel];

	if( chan.state!=0 ){
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
	
	if( chan.state!=0 ){
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
	return chan.state;
}

gxtkAudio.prototype.SetVolume=function( channel,volume ){
	var chan=this.channels[channel];
	if( chan.state!=0 ) chan.audio.volume=volume;
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

gxtkSample.prototype.Discard=function(){
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
function bb_exception_DiddyException(){
	ThrowableObject.call(this);
	this.f_message="";
	this.f_cause=null;
	this.f_type="";
	this.f_fullType="";
}
bb_exception_DiddyException.prototype=extend_class(ThrowableObject);
bb_exception_DiddyException.prototype.m_Message=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<22>";
	pop_err();
	return this.f_message;
}
bb_exception_DiddyException.prototype.m_Message2=function(t_message){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<26>";
	dbg_object(this).f_message=t_message;
	pop_err();
}
bb_exception_DiddyException.prototype.m_Cause=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<30>";
	pop_err();
	return this.f_cause;
}
bb_exception_DiddyException.prototype.m_Cause2=function(t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<34>";
	if(t_cause==(this)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<34>";
		t_cause=null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<35>";
	dbg_object(this).f_cause=t_cause;
	pop_err();
}
bb_exception_DiddyException.prototype.m_Type=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<39>";
	pop_err();
	return this.f_type;
}
bb_exception_DiddyException.prototype.m_FullType=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<43>";
	pop_err();
	return this.f_fullType;
}
bb_exception_DiddyException.prototype.m_ToString=function(t_recurse){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<63>";
	var t_rv=this.f_type+": "+this.f_message;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<64>";
	if(t_recurse){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<65>";
		var t_depth=10;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<66>";
		var t_current=this.f_cause;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<67>";
		while(((t_current)!=null) && t_depth>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<68>";
			if((object_downcast((t_current),bb_exception_DiddyException))!=null){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<69>";
				t_rv=t_rv+("\nCaused by "+this.f_type+": "+dbg_object(object_downcast((t_current),bb_exception_DiddyException)).f_message);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<70>";
				t_current=dbg_object(object_downcast((t_current),bb_exception_DiddyException)).f_cause;
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
function bb_exception_DiddyException_new(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<47>";
	dbg_object(this).f_message=t_message;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<48>";
	dbg_object(this).f_cause=t_cause;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<49>";
	var t_ci=bb_reflection_GetClass2(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<50>";
	if((t_ci)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<51>";
		dbg_object(this).f_fullType=t_ci.m_Name();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<53>";
		dbg_object(this).f_fullType="diddy.exception.DiddyException";
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<55>";
	if(dbg_object(this).f_fullType.indexOf(".")!=-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<56>";
		dbg_object(this).f_type=dbg_object(this).f_fullType.slice(dbg_object(this).f_fullType.lastIndexOf(".")+1);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<58>";
		dbg_object(this).f_type=dbg_object(this).f_fullType;
	}
	pop_err();
	return this;
}
function bb_reflection_ClassInfo(){
	Object.call(this);
	this.f__name="";
	this.f__attrs=0;
	this.f__sclass=null;
	this.f__ifaces=[];
	this.f__rconsts=[];
	this.f__consts=[];
	this.f__rfields=[];
	this.f__fields=[];
	this.f__rglobals=[];
	this.f__globals=[];
	this.f__rmethods=[];
	this.f__methods=[];
	this.f__rfunctions=[];
	this.f__functions=[];
	this.f__ctors=[];
}
bb_reflection_ClassInfo.prototype.m_Name=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<266>";
	pop_err();
	return this.f__name;
}
function bb_reflection_ClassInfo_new(t_name,t_attrs,t_sclass,t_ifaces){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<259>";
	this.f__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<260>";
	this.f__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<261>";
	this.f__sclass=t_sclass;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<262>";
	this.f__ifaces=t_ifaces;
	pop_err();
	return this;
}
function bb_reflection_ClassInfo_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<256>";
	pop_err();
	return this;
}
bb_reflection_ClassInfo.prototype.m_Init=function(){
	push_err();
	pop_err();
	return 0;
}
bb_reflection_ClassInfo.prototype.m_InitR=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>";
	if((this.f__sclass)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<466>";
		var t_consts=bb_stack_Stack_new2.call(new bb_stack_Stack,dbg_object(this.f__sclass).f__rconsts);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>";
		var t_=this.f__consts;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>";
		var t_2=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>";
		while(t_2<t_.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>";
			var t_t=dbg_array(t_,t_2)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>";
			t_2=t_2+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<468>";
			t_consts.m_Push(t_t);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<470>";
		this.f__rconsts=t_consts.m_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<471>";
		var t_fields=bb_stack_Stack2_new2.call(new bb_stack_Stack2,dbg_object(this.f__sclass).f__rfields);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>";
		var t_3=this.f__fields;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>";
		var t_4=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>";
		while(t_4<t_3.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>";
			var t_t2=dbg_array(t_3,t_4)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>";
			t_4=t_4+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<473>";
			t_fields.m_Push2(t_t2);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<475>";
		this.f__rfields=t_fields.m_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<476>";
		var t_globals=bb_stack_Stack3_new2.call(new bb_stack_Stack3,dbg_object(this.f__sclass).f__rglobals);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<477>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<477>";
		var t_5=this.f__globals;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<477>";
		var t_6=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<477>";
		while(t_6<t_5.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<477>";
			var t_t3=dbg_array(t_5,t_6)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<477>";
			t_6=t_6+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<478>";
			t_globals.m_Push3(t_t3);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<480>";
		this.f__rglobals=t_globals.m_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<481>";
		var t_methods=bb_stack_Stack4_new2.call(new bb_stack_Stack4,dbg_object(this.f__sclass).f__rmethods);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>";
		var t_7=this.f__methods;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>";
		var t_8=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>";
		while(t_8<t_7.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>";
			var t_t4=dbg_array(t_7,t_8)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>";
			t_8=t_8+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<483>";
			t_methods.m_Push4(t_t4);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<485>";
		this.f__rmethods=t_methods.m_ToArray();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<486>";
		var t_functions=bb_stack_Stack5_new2.call(new bb_stack_Stack5,dbg_object(this.f__sclass).f__rfunctions);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<487>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<487>";
		var t_9=this.f__functions;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<487>";
		var t_10=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<487>";
		while(t_10<t_9.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<487>";
			var t_t5=dbg_array(t_9,t_10)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<487>";
			t_10=t_10+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<488>";
			t_functions.m_Push5(t_t5);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<490>";
		this.f__rfunctions=t_functions.m_ToArray();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<492>";
		this.f__rconsts=this.f__consts;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<493>";
		this.f__rfields=this.f__fields;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<494>";
		this.f__rglobals=this.f__globals;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<495>";
		this.f__rmethods=this.f__methods;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<496>";
		this.f__rfunctions=this.f__functions;
	}
	pop_err();
	return 0;
}
function bb_map_Map(){
	Object.call(this);
	this.f_root=null;
}
function bb_map_Map_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
bb_map_Map.prototype.m_Compare=function(t_lhs,t_rhs){
}
bb_map_Map.prototype.m_RotateLeft=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>";
	var t_child=dbg_object(t_node).f_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>";
	dbg_object(t_node).f_right=dbg_object(t_child).f_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>";
	if((dbg_object(t_child).f_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>";
		dbg_object(dbg_object(t_child).f_left).f_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>";
	dbg_object(t_child).f_parent=dbg_object(t_node).f_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>";
	if((dbg_object(t_node).f_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>";
		if(t_node==dbg_object(dbg_object(t_node).f_parent).f_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>";
			dbg_object(dbg_object(t_node).f_parent).f_left=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>";
			dbg_object(dbg_object(t_node).f_parent).f_right=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>";
		this.f_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>";
	dbg_object(t_child).f_left=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>";
	dbg_object(t_node).f_parent=t_child;
	pop_err();
	return 0;
}
bb_map_Map.prototype.m_RotateRight=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>";
	var t_child=dbg_object(t_node).f_left;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>";
	dbg_object(t_node).f_left=dbg_object(t_child).f_right;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>";
	if((dbg_object(t_child).f_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>";
		dbg_object(dbg_object(t_child).f_right).f_parent=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>";
	dbg_object(t_child).f_parent=dbg_object(t_node).f_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>";
	if((dbg_object(t_node).f_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>";
		if(t_node==dbg_object(dbg_object(t_node).f_parent).f_right){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>";
			dbg_object(dbg_object(t_node).f_parent).f_right=t_child;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>";
			dbg_object(dbg_object(t_node).f_parent).f_left=t_child;
		}
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>";
		this.f_root=t_child;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>";
	dbg_object(t_child).f_right=t_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>";
	dbg_object(t_node).f_parent=t_child;
	pop_err();
	return 0;
}
bb_map_Map.prototype.m_InsertFixup=function(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>";
	while(((dbg_object(t_node).f_parent)!=null) && dbg_object(dbg_object(t_node).f_parent).f_color==-1 && ((dbg_object(dbg_object(t_node).f_parent).f_parent)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>";
		if(dbg_object(t_node).f_parent==dbg_object(dbg_object(dbg_object(t_node).f_parent).f_parent).f_left){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>";
			var t_uncle=dbg_object(dbg_object(dbg_object(t_node).f_parent).f_parent).f_right;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>";
			if(((t_uncle)!=null) && dbg_object(t_uncle).f_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>";
				dbg_object(dbg_object(t_node).f_parent).f_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>";
				dbg_object(t_uncle).f_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>";
				dbg_object(dbg_object(t_uncle).f_parent).f_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>";
				t_node=dbg_object(t_uncle).f_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>";
				if(t_node==dbg_object(dbg_object(t_node).f_parent).f_right){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>";
					t_node=dbg_object(t_node).f_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>";
					this.m_RotateLeft(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>";
				dbg_object(dbg_object(t_node).f_parent).f_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>";
				dbg_object(dbg_object(dbg_object(t_node).f_parent).f_parent).f_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>";
				this.m_RotateRight(dbg_object(dbg_object(t_node).f_parent).f_parent);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>";
			var t_uncle2=dbg_object(dbg_object(dbg_object(t_node).f_parent).f_parent).f_left;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>";
			if(((t_uncle2)!=null) && dbg_object(t_uncle2).f_color==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>";
				dbg_object(dbg_object(t_node).f_parent).f_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>";
				dbg_object(t_uncle2).f_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>";
				dbg_object(dbg_object(t_uncle2).f_parent).f_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>";
				t_node=dbg_object(t_uncle2).f_parent;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>";
				if(t_node==dbg_object(dbg_object(t_node).f_parent).f_left){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>";
					t_node=dbg_object(t_node).f_parent;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>";
					this.m_RotateRight(t_node);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>";
				dbg_object(dbg_object(t_node).f_parent).f_color=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>";
				dbg_object(dbg_object(dbg_object(t_node).f_parent).f_parent).f_color=-1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>";
				this.m_RotateLeft(dbg_object(dbg_object(t_node).f_parent).f_parent);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>";
	dbg_object(this.f_root).f_color=1;
	pop_err();
	return 0;
}
bb_map_Map.prototype.m_Set=function(t_key,t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>";
	var t_node=this.f_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_parent=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>";
	var t_cmp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>";
		t_parent=t_node;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>";
		t_cmp=this.m_Compare(t_key,dbg_object(t_node).f_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>";
			t_node=dbg_object(t_node).f_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>";
				t_node=dbg_object(t_node).f_left;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>";
				dbg_object(t_node).f_value=t_value;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>";
				pop_err();
				return false;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>";
	t_node=bb_map_Node_new.call(new bb_map_Node,t_key,t_value,-1,t_parent);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>";
	if((t_parent)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>";
			dbg_object(t_parent).f_right=t_node;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>";
			dbg_object(t_parent).f_left=t_node;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>";
		this.m_InsertFixup(t_node);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>";
		this.f_root=t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>";
	pop_err();
	return true;
}
bb_map_Map.prototype.m_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.f_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.m_Compare(t_key,dbg_object(t_node).f_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).f_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).f_left;
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
bb_map_Map.prototype.m_Contains=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>";
	var t_=this.m_FindNode(t_key)!=null;
	pop_err();
	return t_;
}
bb_map_Map.prototype.m_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.m_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).f_value;
	}
	pop_err();
	return null;
}
function bb_map_StringMap(){
	bb_map_Map.call(this);
}
bb_map_StringMap.prototype=extend_class(bb_map_Map);
function bb_map_StringMap_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	bb_map_Map_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
bb_map_StringMap.prototype.m_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
var bb_reflection__classesMap;
var bb_reflection__classes;
function bb_map_Node(){
	Object.call(this);
	this.f_key="";
	this.f_right=null;
	this.f_left=null;
	this.f_value=null;
	this.f_color=0;
	this.f_parent=null;
}
function bb_map_Node_new(t_key,t_value,t_color,t_parent){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>";
	dbg_object(this).f_key=t_key;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>";
	dbg_object(this).f_value=t_value;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>";
	dbg_object(this).f_color=t_color;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>";
	dbg_object(this).f_parent=t_parent;
	pop_err();
	return this;
}
function bb_map_Node_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>";
	pop_err();
	return this;
}
function bb_reflection_GetClass(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<507>";
	if(!((bb_reflection__classesMap)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<508>";
		bb_reflection__classesMap=bb_map_StringMap_new.call(new bb_map_StringMap);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<509>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<509>";
		var t_=bb_reflection__classes;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<509>";
		var t_2=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<509>";
		while(t_2<t_.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<509>";
			var t_c=dbg_array(t_,t_2)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<509>";
			t_2=t_2+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<510>";
			var t_name2=t_c.m_Name();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<511>";
			bb_reflection__classesMap.m_Set(t_name2,t_c);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<512>";
			var t_i=t_name2.lastIndexOf(".");
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<513>";
			if(t_i==-1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<513>";
				continue;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<514>";
			t_name2=t_name2.slice(t_i+1);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<515>";
			if(bb_reflection__classesMap.m_Contains(t_name2)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<516>";
				bb_reflection__classesMap.m_Set(t_name2,null);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<518>";
				bb_reflection__classesMap.m_Set(t_name2,t_c);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<522>";
	var t_3=bb_reflection__classesMap.m_Get(t_name);
	pop_err();
	return t_3;
}
function bb_reflection__GetClass(){
	Object.call(this);
}
bb_reflection__GetClass.prototype.m_GetClass=function(t_obj){
}
function bb_reflection__GetClass_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<652>";
	pop_err();
	return this;
}
var bb_reflection__getClass;
function bb_reflection_GetClass2(t_obj){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<526>";
	var t_=bb_reflection__getClass.m_GetClass(t_obj);
	pop_err();
	return t_;
}
function bb_exception_AssertException(){
	bb_exception_DiddyException.call(this);
}
bb_exception_AssertException.prototype=extend_class(bb_exception_DiddyException);
function bb_exception_AssertException_new(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<86>";
	bb_exception_DiddyException_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function bb_exception_ConcurrentModificationException(){
	bb_exception_DiddyException.call(this);
}
bb_exception_ConcurrentModificationException.prototype=extend_class(bb_exception_DiddyException);
function bb_exception_ConcurrentModificationException_new(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<92>";
	bb_exception_DiddyException_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function bb_exception_IndexOutOfBoundsException(){
	bb_exception_DiddyException.call(this);
}
bb_exception_IndexOutOfBoundsException.prototype=extend_class(bb_exception_DiddyException);
function bb_exception_IndexOutOfBoundsException_new(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<98>";
	bb_exception_DiddyException_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function bb_exception_IllegalArgumentException(){
	bb_exception_DiddyException.call(this);
}
bb_exception_IllegalArgumentException.prototype=extend_class(bb_exception_DiddyException);
function bb_exception_IllegalArgumentException_new(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<104>";
	bb_exception_DiddyException_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function bb_exception_XMLParseException(){
	bb_exception_DiddyException.call(this);
}
bb_exception_XMLParseException.prototype=extend_class(bb_exception_DiddyException);
function bb_exception_XMLParseException_new(t_message,t_cause){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<110>";
	bb_exception_DiddyException_new.call(this,t_message,t_cause);
	pop_err();
	return this;
}
function bb_boxes_BoolObject(){
	Object.call(this);
	this.f_value=false;
}
function bb_boxes_BoolObject_new(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<11>";
	dbg_object(this).f_value=t_value;
	pop_err();
	return this;
}
bb_boxes_BoolObject.prototype.m_ToBool=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<15>";
	pop_err();
	return this.f_value;
}
bb_boxes_BoolObject.prototype.m_Equals=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<19>";
	var t_=this.f_value==dbg_object(t_box).f_value;
	pop_err();
	return t_;
}
function bb_boxes_BoolObject_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<7>";
	pop_err();
	return this;
}
function bb_boxes_IntObject(){
	Object.call(this);
	this.f_value=0;
}
function bb_boxes_IntObject_new(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<27>";
	dbg_object(this).f_value=t_value;
	pop_err();
	return this;
}
function bb_boxes_IntObject_new2(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<31>";
	dbg_object(this).f_value=((t_value)|0);
	pop_err();
	return this;
}
bb_boxes_IntObject.prototype.m_ToInt=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<35>";
	pop_err();
	return this.f_value;
}
bb_boxes_IntObject.prototype.m_ToFloat=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<39>";
	var t_=(this.f_value);
	pop_err();
	return t_;
}
bb_boxes_IntObject.prototype.m_ToString2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<43>";
	var t_=String(this.f_value);
	pop_err();
	return t_;
}
bb_boxes_IntObject.prototype.m_Equals2=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<47>";
	var t_=this.f_value==dbg_object(t_box).f_value;
	pop_err();
	return t_;
}
bb_boxes_IntObject.prototype.m_Compare2=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<51>";
	var t_=this.f_value-dbg_object(t_box).f_value;
	pop_err();
	return t_;
}
function bb_boxes_IntObject_new3(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<23>";
	pop_err();
	return this;
}
function bb_boxes_FloatObject(){
	Object.call(this);
	this.f_value=.0;
}
function bb_boxes_FloatObject_new(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<59>";
	dbg_object(this).f_value=(t_value);
	pop_err();
	return this;
}
function bb_boxes_FloatObject_new2(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<63>";
	dbg_object(this).f_value=t_value;
	pop_err();
	return this;
}
bb_boxes_FloatObject.prototype.m_ToInt=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<67>";
	var t_=((this.f_value)|0);
	pop_err();
	return t_;
}
bb_boxes_FloatObject.prototype.m_ToFloat=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<71>";
	pop_err();
	return this.f_value;
}
bb_boxes_FloatObject.prototype.m_ToString2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<75>";
	var t_=String(this.f_value);
	pop_err();
	return t_;
}
bb_boxes_FloatObject.prototype.m_Equals3=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<79>";
	var t_=this.f_value==dbg_object(t_box).f_value;
	pop_err();
	return t_;
}
bb_boxes_FloatObject.prototype.m_Compare3=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<83>";
	if(this.f_value<dbg_object(t_box).f_value){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<83>";
		pop_err();
		return -1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<84>";
	var t_=((this.f_value>dbg_object(t_box).f_value)?1:0);
	pop_err();
	return t_;
}
function bb_boxes_FloatObject_new3(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<55>";
	pop_err();
	return this;
}
function bb_boxes_StringObject(){
	Object.call(this);
	this.f_value="";
}
function bb_boxes_StringObject_new(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<92>";
	dbg_object(this).f_value=String(t_value);
	pop_err();
	return this;
}
function bb_boxes_StringObject_new2(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<96>";
	dbg_object(this).f_value=String(t_value);
	pop_err();
	return this;
}
function bb_boxes_StringObject_new3(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<100>";
	dbg_object(this).f_value=t_value;
	pop_err();
	return this;
}
bb_boxes_StringObject.prototype.m_ToString2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<104>";
	pop_err();
	return this.f_value;
}
bb_boxes_StringObject.prototype.m_Equals4=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<108>";
	var t_=this.f_value==dbg_object(t_box).f_value;
	pop_err();
	return t_;
}
bb_boxes_StringObject.prototype.m_Compare4=function(t_box){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<112>";
	var t_=string_compare(this.f_value,dbg_object(t_box).f_value);
	pop_err();
	return t_;
}
function bb_boxes_StringObject_new4(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<88>";
	pop_err();
	return this;
}
function bb_reflection_R8(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R8.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R8_new(){
	bb_reflection_ClassInfo_new.call(this,"monkey.lang.Object",1,null,[]);
	return this;
}
bb_reflection_R8.prototype.m_Init=function(){
	this.m_InitR();
	return 0;
}
function bb_reflection_R9(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R9.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R9_new(){
	bb_reflection_ClassInfo_new.call(this,"monkey.lang.throwable",33,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	return this;
}
bb_reflection_R9.prototype.m_Init=function(){
	this.m_InitR();
	return 0;
}
function bb_reflection_R10(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R10.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R10_new(){
	bb_reflection_ClassInfo_new.call(this,"diddy.exception.DiddyException",32,dbg_array(bb_reflection__classes,1)[dbg_index],[]);
	return this;
}
bb_reflection_R10.prototype.m_Init=function(){
	this.f__fields=new_object_array(4);
	dbg_array(this.f__fields,0)[dbg_index]=(bb_reflection_R11_new.call(new bb_reflection_R11))
	dbg_array(this.f__fields,1)[dbg_index]=(bb_reflection_R12_new.call(new bb_reflection_R12))
	dbg_array(this.f__fields,2)[dbg_index]=(bb_reflection_R13_new.call(new bb_reflection_R13))
	dbg_array(this.f__fields,3)[dbg_index]=(bb_reflection_R14_new.call(new bb_reflection_R14))
	this.f__methods=new_object_array(7);
	dbg_array(this.f__methods,0)[dbg_index]=(bb_reflection_R15_new.call(new bb_reflection_R15))
	dbg_array(this.f__methods,1)[dbg_index]=(bb_reflection_R16_new.call(new bb_reflection_R16))
	dbg_array(this.f__methods,2)[dbg_index]=(bb_reflection_R17_new.call(new bb_reflection_R17))
	dbg_array(this.f__methods,3)[dbg_index]=(bb_reflection_R18_new.call(new bb_reflection_R18))
	dbg_array(this.f__methods,4)[dbg_index]=(bb_reflection_R19_new.call(new bb_reflection_R19))
	dbg_array(this.f__methods,5)[dbg_index]=(bb_reflection_R20_new.call(new bb_reflection_R20))
	dbg_array(this.f__methods,6)[dbg_index]=(bb_reflection_R22_new.call(new bb_reflection_R22))
	this.f__ctors=new_object_array(1);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R21_new.call(new bb_reflection_R21))
	this.m_InitR();
	return 0;
}
function bb_reflection_R23(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R23.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R23_new(){
	bb_reflection_ClassInfo_new.call(this,"diddy.exception.AssertException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
bb_reflection_R23.prototype.m_Init=function(){
	this.f__ctors=new_object_array(1);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R24_new.call(new bb_reflection_R24))
	this.m_InitR();
	return 0;
}
function bb_reflection_R25(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R25.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R25_new(){
	bb_reflection_ClassInfo_new.call(this,"diddy.exception.ConcurrentModificationException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
bb_reflection_R25.prototype.m_Init=function(){
	this.f__ctors=new_object_array(1);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R26_new.call(new bb_reflection_R26))
	this.m_InitR();
	return 0;
}
function bb_reflection_R27(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R27.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R27_new(){
	bb_reflection_ClassInfo_new.call(this,"diddy.exception.IndexOutOfBoundsException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
bb_reflection_R27.prototype.m_Init=function(){
	this.f__ctors=new_object_array(1);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R28_new.call(new bb_reflection_R28))
	this.m_InitR();
	return 0;
}
function bb_reflection_R29(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R29.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R29_new(){
	bb_reflection_ClassInfo_new.call(this,"diddy.exception.IllegalArgumentException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
bb_reflection_R29.prototype.m_Init=function(){
	this.f__ctors=new_object_array(1);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R30_new.call(new bb_reflection_R30))
	this.m_InitR();
	return 0;
}
function bb_reflection_R31(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R31.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R31_new(){
	bb_reflection_ClassInfo_new.call(this,"diddy.exception.XMLParseException",32,dbg_array(bb_reflection__classes,2)[dbg_index],[]);
	return this;
}
bb_reflection_R31.prototype.m_Init=function(){
	this.f__ctors=new_object_array(1);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R32_new.call(new bb_reflection_R32))
	this.m_InitR();
	return 0;
}
function bb_reflection_R33(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R33.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R33_new(){
	bb_reflection_ClassInfo_new.call(this,"monkey.boxes.BoolObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__boolClass=(this);
	return this;
}
bb_reflection_R33.prototype.m_Init=function(){
	this.f__fields=new_object_array(1);
	dbg_array(this.f__fields,0)[dbg_index]=(bb_reflection_R34_new.call(new bb_reflection_R34))
	this.f__methods=new_object_array(2);
	dbg_array(this.f__methods,0)[dbg_index]=(bb_reflection_R36_new.call(new bb_reflection_R36))
	dbg_array(this.f__methods,1)[dbg_index]=(bb_reflection_R37_new.call(new bb_reflection_R37))
	this.f__ctors=new_object_array(2);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R35_new.call(new bb_reflection_R35))
	dbg_array(this.f__ctors,1)[dbg_index]=(bb_reflection_R38_new.call(new bb_reflection_R38))
	this.m_InitR();
	return 0;
}
var bb_reflection__boolClass;
function bb_reflection_R39(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R39.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R39_new(){
	bb_reflection_ClassInfo_new.call(this,"monkey.boxes.IntObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__intClass=(this);
	return this;
}
bb_reflection_R39.prototype.m_Init=function(){
	this.f__fields=new_object_array(1);
	dbg_array(this.f__fields,0)[dbg_index]=(bb_reflection_R40_new.call(new bb_reflection_R40))
	this.f__methods=new_object_array(5);
	dbg_array(this.f__methods,0)[dbg_index]=(bb_reflection_R43_new.call(new bb_reflection_R43))
	dbg_array(this.f__methods,1)[dbg_index]=(bb_reflection_R44_new.call(new bb_reflection_R44))
	dbg_array(this.f__methods,2)[dbg_index]=(bb_reflection_R45_new.call(new bb_reflection_R45))
	dbg_array(this.f__methods,3)[dbg_index]=(bb_reflection_R46_new.call(new bb_reflection_R46))
	dbg_array(this.f__methods,4)[dbg_index]=(bb_reflection_R47_new.call(new bb_reflection_R47))
	this.f__ctors=new_object_array(3);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R41_new.call(new bb_reflection_R41))
	dbg_array(this.f__ctors,1)[dbg_index]=(bb_reflection_R42_new.call(new bb_reflection_R42))
	dbg_array(this.f__ctors,2)[dbg_index]=(bb_reflection_R48_new.call(new bb_reflection_R48))
	this.m_InitR();
	return 0;
}
var bb_reflection__intClass;
function bb_reflection_R49(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R49.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R49_new(){
	bb_reflection_ClassInfo_new.call(this,"monkey.boxes.FloatObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__floatClass=(this);
	return this;
}
bb_reflection_R49.prototype.m_Init=function(){
	this.f__fields=new_object_array(1);
	dbg_array(this.f__fields,0)[dbg_index]=(bb_reflection_R50_new.call(new bb_reflection_R50))
	this.f__methods=new_object_array(5);
	dbg_array(this.f__methods,0)[dbg_index]=(bb_reflection_R53_new.call(new bb_reflection_R53))
	dbg_array(this.f__methods,1)[dbg_index]=(bb_reflection_R54_new.call(new bb_reflection_R54))
	dbg_array(this.f__methods,2)[dbg_index]=(bb_reflection_R55_new.call(new bb_reflection_R55))
	dbg_array(this.f__methods,3)[dbg_index]=(bb_reflection_R56_new.call(new bb_reflection_R56))
	dbg_array(this.f__methods,4)[dbg_index]=(bb_reflection_R57_new.call(new bb_reflection_R57))
	this.f__ctors=new_object_array(3);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R51_new.call(new bb_reflection_R51))
	dbg_array(this.f__ctors,1)[dbg_index]=(bb_reflection_R52_new.call(new bb_reflection_R52))
	dbg_array(this.f__ctors,2)[dbg_index]=(bb_reflection_R58_new.call(new bb_reflection_R58))
	this.m_InitR();
	return 0;
}
var bb_reflection__floatClass;
function bb_reflection_R59(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_R59.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_R59_new(){
	bb_reflection_ClassInfo_new.call(this,"monkey.boxes.StringObject",0,dbg_array(bb_reflection__classes,0)[dbg_index],[]);
	bb_reflection__stringClass=(this);
	return this;
}
bb_reflection_R59.prototype.m_Init=function(){
	this.f__fields=new_object_array(1);
	dbg_array(this.f__fields,0)[dbg_index]=(bb_reflection_R60_new.call(new bb_reflection_R60))
	this.f__methods=new_object_array(3);
	dbg_array(this.f__methods,0)[dbg_index]=(bb_reflection_R64_new.call(new bb_reflection_R64))
	dbg_array(this.f__methods,1)[dbg_index]=(bb_reflection_R65_new.call(new bb_reflection_R65))
	dbg_array(this.f__methods,2)[dbg_index]=(bb_reflection_R66_new.call(new bb_reflection_R66))
	this.f__ctors=new_object_array(4);
	dbg_array(this.f__ctors,0)[dbg_index]=(bb_reflection_R61_new.call(new bb_reflection_R61))
	dbg_array(this.f__ctors,1)[dbg_index]=(bb_reflection_R62_new.call(new bb_reflection_R62))
	dbg_array(this.f__ctors,2)[dbg_index]=(bb_reflection_R63_new.call(new bb_reflection_R63))
	dbg_array(this.f__ctors,3)[dbg_index]=(bb_reflection_R67_new.call(new bb_reflection_R67))
	this.m_InitR();
	return 0;
}
var bb_reflection__stringClass;
function bb_reflection_FunctionInfo(){
	Object.call(this);
	this.f__name="";
	this.f__attrs=0;
	this.f__retType=null;
	this.f__argTypes=[];
}
function bb_reflection_FunctionInfo_new(t_name,t_attrs,t_retType,t_argTypes){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<223>";
	this.f__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<224>";
	this.f__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<225>";
	this.f__retType=t_retType;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<226>";
	this.f__argTypes=t_argTypes;
	pop_err();
	return this;
}
function bb_reflection_FunctionInfo_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<220>";
	pop_err();
	return this;
}
var bb_reflection__functions;
function bb_reflection_R4(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R4.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R4_new(){
	bb_reflection_FunctionInfo_new.call(this,"monkey.lang.Print",1,bb_reflection__intClass,[bb_reflection__stringClass]);
	return this;
}
function bb_reflection_R5(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R5.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R5_new(){
	bb_reflection_FunctionInfo_new.call(this,"monkey.lang.Error",1,bb_reflection__intClass,[bb_reflection__stringClass]);
	return this;
}
function bb_reflection_R6(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R6.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R6_new(){
	bb_reflection_FunctionInfo_new.call(this,"monkey.lang.DebugLog",1,bb_reflection__intClass,[bb_reflection__stringClass]);
	return this;
}
function bb_reflection_R7(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R7.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R7_new(){
	bb_reflection_FunctionInfo_new.call(this,"monkey.lang.DebugStop",1,bb_reflection__intClass,[]);
	return this;
}
function bb_reflection___GetClass(){
	bb_reflection__GetClass.call(this);
}
bb_reflection___GetClass.prototype=extend_class(bb_reflection__GetClass);
function bb_reflection___GetClass_new(){
	push_err();
	err_info="$SOURCE<673>";
	bb_reflection__GetClass_new.call(this);
	err_info="$SOURCE<673>";
	pop_err();
	return this;
}
bb_reflection___GetClass.prototype.m_GetClass=function(t_o){
	if(object_downcast((t_o),bb_boxes_StringObject)!=null){
		return dbg_array(bb_reflection__classes,11)[dbg_index];
	}
	if(object_downcast((t_o),bb_boxes_FloatObject)!=null){
		return dbg_array(bb_reflection__classes,10)[dbg_index];
	}
	if(object_downcast((t_o),bb_boxes_IntObject)!=null){
		return dbg_array(bb_reflection__classes,9)[dbg_index];
	}
	if(object_downcast((t_o),bb_boxes_BoolObject)!=null){
		return dbg_array(bb_reflection__classes,8)[dbg_index];
	}
	if(object_downcast((t_o),bb_exception_XMLParseException)!=null){
		return dbg_array(bb_reflection__classes,7)[dbg_index];
	}
	if(object_downcast((t_o),bb_exception_IllegalArgumentException)!=null){
		return dbg_array(bb_reflection__classes,6)[dbg_index];
	}
	if(object_downcast((t_o),bb_exception_IndexOutOfBoundsException)!=null){
		return dbg_array(bb_reflection__classes,5)[dbg_index];
	}
	if(object_downcast((t_o),bb_exception_ConcurrentModificationException)!=null){
		return dbg_array(bb_reflection__classes,4)[dbg_index];
	}
	if(object_downcast((t_o),bb_exception_AssertException)!=null){
		return dbg_array(bb_reflection__classes,3)[dbg_index];
	}
	if(object_downcast((t_o),bb_exception_DiddyException)!=null){
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
	dbg_array(bb_reflection__classes,0)[dbg_index]=(bb_reflection_R8_new.call(new bb_reflection_R8))
	dbg_array(bb_reflection__classes,1)[dbg_index]=(bb_reflection_R9_new.call(new bb_reflection_R9))
	dbg_array(bb_reflection__classes,2)[dbg_index]=(bb_reflection_R10_new.call(new bb_reflection_R10))
	dbg_array(bb_reflection__classes,3)[dbg_index]=(bb_reflection_R23_new.call(new bb_reflection_R23))
	dbg_array(bb_reflection__classes,4)[dbg_index]=(bb_reflection_R25_new.call(new bb_reflection_R25))
	dbg_array(bb_reflection__classes,5)[dbg_index]=(bb_reflection_R27_new.call(new bb_reflection_R27))
	dbg_array(bb_reflection__classes,6)[dbg_index]=(bb_reflection_R29_new.call(new bb_reflection_R29))
	dbg_array(bb_reflection__classes,7)[dbg_index]=(bb_reflection_R31_new.call(new bb_reflection_R31))
	dbg_array(bb_reflection__classes,8)[dbg_index]=(bb_reflection_R33_new.call(new bb_reflection_R33))
	dbg_array(bb_reflection__classes,9)[dbg_index]=(bb_reflection_R39_new.call(new bb_reflection_R39))
	dbg_array(bb_reflection__classes,10)[dbg_index]=(bb_reflection_R49_new.call(new bb_reflection_R49))
	dbg_array(bb_reflection__classes,11)[dbg_index]=(bb_reflection_R59_new.call(new bb_reflection_R59))
	dbg_array(bb_reflection__classes,0)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,1)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,2)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,3)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,4)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,5)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,6)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,7)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,8)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,9)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,10)[dbg_index].m_Init();
	dbg_array(bb_reflection__classes,11)[dbg_index].m_Init();
	bb_reflection__functions=new_object_array(4);
	dbg_array(bb_reflection__functions,0)[dbg_index]=(bb_reflection_R4_new.call(new bb_reflection_R4))
	dbg_array(bb_reflection__functions,1)[dbg_index]=(bb_reflection_R5_new.call(new bb_reflection_R5))
	dbg_array(bb_reflection__functions,2)[dbg_index]=(bb_reflection_R6_new.call(new bb_reflection_R6))
	dbg_array(bb_reflection__functions,3)[dbg_index]=(bb_reflection_R7_new.call(new bb_reflection_R7))
	bb_reflection__getClass=(bb_reflection___GetClass_new.call(new bb_reflection___GetClass));
	return 0;
}
var bb_reflection__init;
function bb_app_App(){
	Object.call(this);
}
function bb_app_App_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<105>";
	bb_app_device=bb_app_AppDevice_new.call(new bb_app_AppDevice,this);
	pop_err();
	return this;
}
bb_app_App.prototype.m_OnCreate=function(){
	push_err();
	pop_err();
	return 0;
}
bb_app_App.prototype.m_OnUpdate=function(){
	push_err();
	pop_err();
	return 0;
}
bb_app_App.prototype.m_OnSuspend=function(){
	push_err();
	pop_err();
	return 0;
}
bb_app_App.prototype.m_OnResume=function(){
	push_err();
	pop_err();
	return 0;
}
bb_app_App.prototype.m_OnRender=function(){
	push_err();
	pop_err();
	return 0;
}
bb_app_App.prototype.m_OnLoading=function(){
	push_err();
	pop_err();
	return 0;
}
function bb_framework_DiddyApp(){
	bb_app_App.call(this);
	this.f_exitScreen=null;
	this.f_screenFade=null;
	this.f_images=null;
	this.f_sounds=null;
	this.f_screens=null;
	this.f_inputCache=null;
	this.f_diddyMouse=null;
	this.f_virtualResOn=true;
	this.f_aspectRatioOn=false;
	this.f_aspectRatio=.0;
	this.f_deviceChanged=0;
	this.f_mouseX=0;
	this.f_mouseY=0;
	this.f_FPS=60;
	this.f_useFixedRateLogic=false;
	this.f_frameRate=200.0;
	this.f_ms=0.0;
	this.f_numTicks=.0;
	this.f_lastNumTicks=.0;
	this.f_lastTime=.0;
	this.f_multi=.0;
	this.f_heightBorder=.0;
	this.f_widthBorder=.0;
	this.f_vsx=.0;
	this.f_vsy=.0;
	this.f_vsw=.0;
	this.f_vsh=.0;
	this.f_virtualScaledW=.0;
	this.f_virtualScaledH=.0;
	this.f_virtualXOff=.0;
	this.f_virtualYOff=.0;
	this.f_autoCls=false;
	this.f_currentScreen=null;
	this.f_debugOn=false;
	this.f_musicFile="";
	this.f_musicOkay=0;
	this.f_musicVolume=100;
	this.f_mojoMusicVolume=1.0;
	this.f_soundVolume=100;
	this.f_drawFPSOn=false;
	this.f_mouseHit=0;
	this.f_debugKeyOn=false;
	this.f_debugKey=112;
	this.f_tmpMs=.0;
	this.f_maxMs=50;
	this.f_nextScreen=null;
}
bb_framework_DiddyApp.prototype=extend_class(bb_app_App);
function bb_framework_DiddyApp_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<167>";
	bb_app_App_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<170>";
	bb_framework_diddyGame=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<171>";
	dbg_object(this).f_exitScreen=bb_framework_ExitScreen_new.call(new bb_framework_ExitScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<172>";
	dbg_object(this).f_screenFade=bb_framework_ScreenFade_new.call(new bb_framework_ScreenFade);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<173>";
	dbg_object(this).f_images=bb_framework_ImageBank_new.call(new bb_framework_ImageBank);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<174>";
	dbg_object(this).f_sounds=bb_framework_SoundBank_new.call(new bb_framework_SoundBank);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<175>";
	dbg_object(this).f_screens=bb_framework_Screens_new.call(new bb_framework_Screens);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<176>";
	dbg_object(this).f_inputCache=bb_inputcache_InputCache_new.call(new bb_inputcache_InputCache);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<177>";
	this.f_diddyMouse=bb_framework_DiddyMouse_new.call(new bb_framework_DiddyMouse);
	pop_err();
	return this;
}
bb_framework_DiddyApp.prototype.m_SetScreenSize=function(t_w,t_h,t_useAspectRatio){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<223>";
	bb_framework_SCREEN_WIDTH=t_w;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<224>";
	bb_framework_SCREEN_HEIGHT=t_h;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<225>";
	bb_framework_SCREEN_WIDTH2=bb_framework_SCREEN_WIDTH/2.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<226>";
	bb_framework_SCREEN_HEIGHT2=bb_framework_SCREEN_HEIGHT/2.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<228>";
	bb_framework_SCREENX_RATIO=bb_framework_DEVICE_WIDTH/bb_framework_SCREEN_WIDTH;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<229>";
	bb_framework_SCREENY_RATIO=bb_framework_DEVICE_HEIGHT/bb_framework_SCREEN_HEIGHT;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<231>";
	if(bb_framework_SCREENX_RATIO!=1.0 || bb_framework_SCREENY_RATIO!=1.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<232>";
		this.f_virtualResOn=true;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<233>";
		this.f_aspectRatioOn=t_useAspectRatio;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<234>";
		this.f_aspectRatio=t_h/t_w;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<236>";
	if((bb_graphics_DeviceWidth())!=bb_framework_SCREEN_WIDTH || (bb_graphics_DeviceHeight())!=bb_framework_SCREEN_HEIGHT){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<237>";
		this.f_deviceChanged=1;
	}
	pop_err();
}
bb_framework_DiddyApp.prototype.m_ResetFixedRateLogic=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<488>";
	this.f_ms=1000.0/this.f_frameRate;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<489>";
	this.f_numTicks=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<490>";
	this.f_lastNumTicks=1.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<491>";
	this.f_lastTime=(bb_app_Millisecs());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<492>";
	if(bb_framework_dt!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<493>";
		dbg_object(bb_framework_dt).f_delta=1.0;
	}
	pop_err();
}
bb_framework_DiddyApp.prototype.m_Create=function(){
	push_err();
	pop_err();
}
bb_framework_DiddyApp.prototype.m_OnCreate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<181>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<183>";
		bb_framework_DEVICE_WIDTH=(bb_graphics_DeviceWidth());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<184>";
		bb_framework_DEVICE_HEIGHT=(bb_graphics_DeviceHeight());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<186>";
		this.m_SetScreenSize(bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT,false);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<187>";
		this.f_deviceChanged=1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<190>";
		this.f_mouseX=((bb_input_MouseX()/bb_framework_SCREENX_RATIO)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<191>";
		this.f_mouseY=((bb_input_MouseY()/bb_framework_SCREENY_RATIO)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<194>";
		bb_random_Seed=diddy.systemMillisecs();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<196>";
		bb_framework_dt=bb_framework_DeltaTimer_new.call(new bb_framework_DeltaTimer,(this.f_FPS));
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<198>";
		bb_app_SetUpdateRate(this.f_FPS);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<201>";
		bb_framework_Particle_Cache();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<204>";
		if(this.f_useFixedRateLogic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<205>";
			this.m_ResetFixedRateLogic();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<209>";
		this.m_Create();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,bb_exception_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<211>";
			print(t_e.m_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<212>";
			error(t_e.m_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<214>";
	pop_err();
	return 0;
}
bb_framework_DiddyApp.prototype.m_DrawDebug=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<396>";
	bb_graphics_SetColor(255.0,255.0,255.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<397>";
	bb_framework_FPSCounter_Draw(0,0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<398>";
	var t_y=10;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<399>";
	var t_gap=14;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<400>";
	bb_graphics_DrawText("Screen             = "+dbg_object(this.f_currentScreen).f_name,0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<401>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<402>";
	bb_graphics_DrawText("Delta              = "+bb_functions_FormatNumber(dbg_object(bb_framework_dt).f_delta,2,0,0),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<403>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<404>";
	bb_graphics_DrawText("Frame Time         = "+String(dbg_object(bb_framework_dt).f_frametime),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<405>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<406>";
	bb_graphics_DrawText("Screen Width       = "+String(bb_framework_SCREEN_WIDTH),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<407>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<408>";
	bb_graphics_DrawText("Screen Height      = "+String(bb_framework_SCREEN_HEIGHT),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<409>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<410>";
	bb_graphics_DrawText("VMouseX            = "+String(dbg_object(this).f_mouseX),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<411>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<412>";
	bb_graphics_DrawText("VMouseY            = "+String(dbg_object(this).f_mouseY),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<413>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<414>";
	bb_graphics_DrawText("MouseX             = "+String(bb_input_MouseX()),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<415>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<416>";
	bb_graphics_DrawText("MouseY             = "+String(bb_input_MouseY()),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<417>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<418>";
	bb_graphics_DrawText("Music File         = "+this.f_musicFile,0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<419>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<420>";
	bb_graphics_DrawText("MusicOkay          = "+String(this.f_musicOkay),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<421>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<422>";
	bb_graphics_DrawText("Music State        = "+String(bb_audio_MusicState()),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<423>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<424>";
	bb_graphics_DrawText("Music Volume       = "+String(dbg_object(this).f_musicVolume),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<425>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<426>";
	bb_graphics_DrawText("Mojo Music Volume  = "+String(dbg_object(this).f_mojoMusicVolume),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<427>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<428>";
	bb_graphics_DrawText("Sound Volume       = "+String(dbg_object(this).f_soundVolume),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<429>";
	t_y+=t_gap;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<430>";
	bb_graphics_DrawText("Sound Channel      = "+String(bb_framework_SoundPlayer_channel),0.0,(t_y),0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<431>";
	t_y+=t_gap;
	pop_err();
}
bb_framework_DiddyApp.prototype.m_DrawFPS=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<436>";
	bb_graphics_DrawText(String(bb_framework_FPSCounter_totalFPS),0.0,0.0,0.0,0.0);
	pop_err();
}
bb_framework_DiddyApp.prototype.m_OnRender=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<242>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<243>";
		bb_framework_FPSCounter_Update();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<244>";
		if(this.f_virtualResOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<245>";
			bb_graphics_PushMatrix();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<246>";
			if(this.f_aspectRatioOn){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<247>";
				if((bb_graphics_DeviceWidth())!=bb_framework_DEVICE_WIDTH || (bb_graphics_DeviceHeight())!=bb_framework_DEVICE_HEIGHT || ((this.f_deviceChanged)!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<248>";
					bb_framework_DEVICE_WIDTH=(bb_graphics_DeviceWidth());
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<249>";
					bb_framework_DEVICE_HEIGHT=(bb_graphics_DeviceHeight());
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<250>";
					this.f_deviceChanged=0;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<252>";
					var t_deviceRatio=bb_framework_DEVICE_HEIGHT/bb_framework_DEVICE_WIDTH;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<253>";
					if(t_deviceRatio>=this.f_aspectRatio){
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<254>";
						this.f_multi=bb_framework_DEVICE_WIDTH/bb_framework_SCREEN_WIDTH;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<255>";
						this.f_heightBorder=(bb_framework_DEVICE_HEIGHT-bb_framework_SCREEN_HEIGHT*this.f_multi)*0.5;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<256>";
						this.f_widthBorder=0.0;
					}else{
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<258>";
						this.f_multi=bb_framework_DEVICE_HEIGHT/bb_framework_SCREEN_HEIGHT;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<259>";
						this.f_widthBorder=(bb_framework_DEVICE_WIDTH-bb_framework_SCREEN_WIDTH*this.f_multi)*0.5;
						err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<260>";
						this.f_heightBorder=0.0;
					}
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<263>";
					this.f_vsx=bb_math_Max2(0.0,this.f_widthBorder);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<264>";
					this.f_vsy=bb_math_Max2(0.0,this.f_heightBorder);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<265>";
					this.f_vsw=bb_math_Min2(bb_framework_DEVICE_WIDTH-this.f_widthBorder*2.0,bb_framework_DEVICE_WIDTH);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<266>";
					this.f_vsh=bb_math_Min2(bb_framework_DEVICE_HEIGHT-this.f_heightBorder*2.0,bb_framework_DEVICE_HEIGHT);
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<268>";
					this.f_virtualScaledW=bb_framework_SCREEN_WIDTH*this.f_multi;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<269>";
					this.f_virtualScaledH=bb_framework_SCREEN_HEIGHT*this.f_multi;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<271>";
					this.f_virtualXOff=(bb_framework_DEVICE_WIDTH-this.f_virtualScaledW)*0.5;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<272>";
					this.f_virtualYOff=(bb_framework_DEVICE_HEIGHT-this.f_virtualScaledH)*0.5;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<274>";
					this.f_virtualXOff=this.f_virtualXOff/this.f_multi;
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<275>";
					this.f_virtualYOff=this.f_virtualYOff/this.f_multi;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<278>";
				bb_graphics_SetScissor(0.0,0.0,bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<279>";
				bb_graphics_Cls(0.0,0.0,0.0);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<281>";
				bb_graphics_SetScissor(this.f_vsx,this.f_vsy,this.f_vsw,this.f_vsh);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<283>";
				bb_graphics_Scale(this.f_multi,this.f_multi);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<285>";
				bb_graphics_Translate(this.f_virtualXOff,this.f_virtualYOff);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<287>";
				bb_graphics_Scale(bb_framework_SCREENX_RATIO,bb_framework_SCREENY_RATIO);
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<292>";
		if(this.f_autoCls){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<292>";
			bb_graphics_Cls(0.0,0.0,0.0);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<295>";
		this.f_currentScreen.m_RenderBackgroundLayers();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<296>";
		this.f_currentScreen.m_Render();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<297>";
		this.f_currentScreen.m_RenderForegroundLayers();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<299>";
		if(this.f_virtualResOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<300>";
			if(this.f_aspectRatioOn){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<301>";
				bb_graphics_SetScissor(0.0,0.0,bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<303>";
			bb_graphics_PopMatrix();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<306>";
		this.f_currentScreen.m_ExtraRender();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<307>";
		if(dbg_object(this.f_screenFade).f_active){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<307>";
			this.f_screenFade.m_Render();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<308>";
		this.f_currentScreen.m_DebugRender();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<309>";
		if(this.f_debugOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<310>";
			this.m_DrawDebug();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<312>";
		if(this.f_drawFPSOn){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<313>";
			this.m_DrawFPS();
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<315>";
		this.f_diddyMouse.m_Update2();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,bb_exception_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<317>";
			print(t_e.m_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<318>";
			error(t_e.m_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<320>";
	pop_err();
	return 0;
}
bb_framework_DiddyApp.prototype.m_ReadInputs=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<324>";
	if(this.f_aspectRatioOn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<325>";
		var t_mouseOffsetX=bb_input_MouseX()-bb_framework_DEVICE_WIDTH*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<326>";
		var t_x=t_mouseOffsetX/this.f_multi/1.0+bb_framework_SCREEN_WIDTH*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<327>";
		this.f_mouseX=((t_x)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<328>";
		var t_mouseOffsetY=bb_input_MouseY()-bb_framework_DEVICE_HEIGHT*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<329>";
		var t_y=t_mouseOffsetY/this.f_multi/1.0+bb_framework_SCREEN_HEIGHT*0.5;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<330>";
		this.f_mouseY=((t_y)|0);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<332>";
		this.f_mouseX=((bb_input_MouseX()/bb_framework_SCREENX_RATIO)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<333>";
		this.f_mouseY=((bb_input_MouseY()/bb_framework_SCREENY_RATIO)|0);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<335>";
	this.f_mouseHit=bb_input_MouseHit(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<336>";
	this.f_inputCache.m_ReadInput();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<337>";
	this.f_inputCache.m_HandleEvents(this.f_currentScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<339>";
	if(this.f_debugKeyOn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<340>";
		if((bb_input_KeyHit(this.f_debugKey))!=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<341>";
			this.f_debugOn=!this.f_debugOn;
		}
	}
	pop_err();
}
bb_framework_DiddyApp.prototype.m_OverrideUpdate=function(){
	push_err();
	pop_err();
}
bb_framework_DiddyApp.prototype.m_SetMojoMusicVolume=function(t_volume){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<458>";
	if(t_volume<0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<458>";
		t_volume=0.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<459>";
	if(t_volume>1.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<459>";
		t_volume=1.0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<460>";
	this.f_mojoMusicVolume=t_volume;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<461>";
	bb_audio_SetMusicVolume(this.f_mojoMusicVolume);
	pop_err();
}
bb_framework_DiddyApp.prototype.m_CalcAnimLength=function(t_ms){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<475>";
	var t_=(t_ms)/(1000.0/(this.f_FPS));
	pop_err();
	return t_;
}
bb_framework_DiddyApp.prototype.m_MusicPlay=function(t_file,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<441>";
	this.f_musicFile=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<443>";
	this.f_musicOkay=bb_audio_PlayMusic("music/"+this.f_musicFile,t_flags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<444>";
	if(this.f_musicOkay==-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<445>";
		print("Error Playing Music - Music must be in the data\\music folder");
	}
	pop_err();
}
bb_framework_DiddyApp.prototype.m_Update=function(t_fixedRateLogicDelta){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<385>";
	bb_framework_dt.m_UpdateDelta();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<386>";
	if(this.f_useFixedRateLogic){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<387>";
		dbg_object(bb_framework_dt).f_delta=t_fixedRateLogicDelta;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<390>";
	if(dbg_object(this.f_screenFade).f_active){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<390>";
		this.f_screenFade.m_Update2();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<391>";
	if(!dbg_object(this.f_screenFade).f_active || dbg_object(this.f_screenFade).f_allowScreenUpdate){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<391>";
		this.f_currentScreen.m_Update2();
	}
	pop_err();
}
bb_framework_DiddyApp.prototype.m_OnUpdate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<347>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<348>";
		this.m_ReadInputs();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<349>";
		this.m_OverrideUpdate();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<350>";
		if(this.f_useFixedRateLogic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<351>";
			var t_now=bb_app_Millisecs();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<352>";
			if((t_now)<this.f_lastTime){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<353>";
				this.f_numTicks=this.f_lastNumTicks;
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<355>";
				this.f_tmpMs=(t_now)-this.f_lastTime;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<356>";
				if(this.f_tmpMs>(this.f_maxMs)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<356>";
					this.f_tmpMs=(this.f_maxMs);
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<357>";
				this.f_numTicks=this.f_tmpMs/this.f_ms;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<360>";
			this.f_lastTime=(t_now);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<361>";
			this.f_lastNumTicks=this.f_numTicks;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<362>";
			for(var t_i=1;(t_i)<=Math.floor(this.f_numTicks);t_i=t_i+1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<363>";
				this.m_Update(1.0);
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<366>";
			var t_re=this.f_numTicks % 1.0;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<367>";
			if(t_re>0.0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<368>";
				this.m_Update(t_re);
			}
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<371>";
			this.m_Update(0.0);
		}
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,bb_exception_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<374>";
			print(t_e.m_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<375>";
			error(t_e.m_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<378>";
	pop_err();
	return 0;
}
bb_framework_DiddyApp.prototype.m_OnSuspend=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<509>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<510>";
		this.f_currentScreen.m_Suspend();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,bb_exception_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<512>";
			print(t_e.m_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<513>";
			error(t_e.m_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<515>";
	pop_err();
	return 0;
}
bb_framework_DiddyApp.prototype.m_OnResume=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<519>";
	try{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<520>";
		dbg_object(bb_framework_dt).f_currentticks=(bb_app_Millisecs());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<521>";
		dbg_object(bb_framework_dt).f_lastticks=dbg_object(bb_framework_dt).f_currentticks;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<522>";
		this.f_currentScreen.m_Resume();
	}catch(_eek_){
		if(t_e=object_downcast(_eek_,bb_exception_DiddyException)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<524>";
			print(t_e.m_ToString(true));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<525>";
			error(t_e.m_ToString(false));
		}else{
			throw _eek_;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<527>";
	pop_err();
	return 0;
}
function bb_mainClass_Game(){
	bb_framework_DiddyApp.call(this);
}
bb_mainClass_Game.prototype=extend_class(bb_framework_DiddyApp);
function bb_mainClass_Game_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<7>";
	bb_framework_DiddyApp_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<7>";
	pop_err();
	return this;
}
bb_mainClass_Game.prototype.m_OnCreate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<9>";
	bb_framework_DiddyApp.prototype.m_OnCreate.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<10>";
	bb_mainClass_titleScreen=bb_mainClass_TitleScreen_new.call(new bb_mainClass_TitleScreen);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<11>";
	bb_mainClass_titleScreen.m_PreStart();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<12>";
	pop_err();
	return 0;
}
function bb_app_AppDevice(){
	gxtkApp.call(this);
	this.f_app=null;
	this.f_updateRate=0;
}
bb_app_AppDevice.prototype=extend_class(gxtkApp);
function bb_app_AppDevice_new(t_app){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<45>";
	dbg_object(this).f_app=t_app;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<46>";
	bb_graphics_SetGraphicsContext(bb_graphics_GraphicsContext_new.call(new bb_graphics_GraphicsContext,this.GraphicsDevice()));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<47>";
	bb_input_SetInputDevice(this.InputDevice());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<48>";
	bb_audio_SetAudioDevice(this.AudioDevice());
	pop_err();
	return this;
}
function bb_app_AppDevice_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<42>";
	pop_err();
	return this;
}
bb_app_AppDevice.prototype.OnCreate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<52>";
	bb_graphics_SetFont(null,32);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<53>";
	var t_=this.f_app.m_OnCreate();
	pop_err();
	return t_;
}
bb_app_AppDevice.prototype.OnUpdate=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<57>";
	var t_=this.f_app.m_OnUpdate();
	pop_err();
	return t_;
}
bb_app_AppDevice.prototype.OnSuspend=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<61>";
	var t_=this.f_app.m_OnSuspend();
	pop_err();
	return t_;
}
bb_app_AppDevice.prototype.OnResume=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<65>";
	var t_=this.f_app.m_OnResume();
	pop_err();
	return t_;
}
bb_app_AppDevice.prototype.OnRender=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<69>";
	bb_graphics_BeginRender();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<70>";
	var t_r=this.f_app.m_OnRender();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<71>";
	bb_graphics_EndRender();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<72>";
	pop_err();
	return t_r;
}
bb_app_AppDevice.prototype.OnLoading=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<76>";
	bb_graphics_BeginRender();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<77>";
	var t_r=this.f_app.m_OnLoading();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<78>";
	bb_graphics_EndRender();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<79>";
	pop_err();
	return t_r;
}
bb_app_AppDevice.prototype.SetUpdateRate=function(t_hertz){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<83>";
	gxtkApp.prototype.SetUpdateRate.call(this,t_hertz);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<84>";
	this.f_updateRate=t_hertz;
	pop_err();
	return 0;
}
function bb_graphics_GraphicsContext(){
	Object.call(this);
	this.f_device=null;
	this.f_defaultFont=null;
	this.f_font=null;
	this.f_firstChar=0;
	this.f_matrixSp=0;
	this.f_ix=1.0;
	this.f_iy=.0;
	this.f_jx=.0;
	this.f_jy=1.0;
	this.f_tx=.0;
	this.f_ty=.0;
	this.f_tformed=0;
	this.f_matDirty=0;
	this.f_color_r=.0;
	this.f_color_g=.0;
	this.f_color_b=.0;
	this.f_alpha=.0;
	this.f_blend=0;
	this.f_scissor_x=.0;
	this.f_scissor_y=.0;
	this.f_scissor_width=.0;
	this.f_scissor_height=.0;
	this.f_matrixStack=new_number_array(192);
}
function bb_graphics_GraphicsContext_new(t_device){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<239>";
	dbg_object(this).f_device=t_device;
	pop_err();
	return this;
}
function bb_graphics_GraphicsContext_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<236>";
	pop_err();
	return this;
}
var bb_graphics_context;
function bb_graphics_SetGraphicsContext(t_gc){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<282>";
	bb_graphics_context=t_gc;
	pop_err();
	return 0;
}
var bb_input_device;
function bb_input_SetInputDevice(t_dev){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<40>";
	bb_input_device=t_dev;
	pop_err();
	return 0;
}
var bb_audio_device;
function bb_audio_SetAudioDevice(t_dev){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<60>";
	bb_audio_device=t_dev;
	pop_err();
	return 0;
}
var bb_app_device;
var bb_framework_diddyGame;
function bb_framework_Screen(){
	Object.call(this);
	this.f_name="";
	this.f_layers=null;
	this.f_autoFadeIn=false;
	this.f_autoFadeInTime=50.0;
	this.f_autoFadeInSound=false;
	this.f_autoFadeInMusic=false;
	this.f_musicPath="";
	this.f_musicFlag=0;
}
function bb_framework_Screen_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<657>";
	pop_err();
	return this;
}
bb_framework_Screen.prototype.m_RenderBackgroundLayers=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<705>";
	if((this.f_layers)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<706>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<706>";
		var t_=this.f_layers.m_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<706>";
		while(t_.m_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<706>";
			var t_layer=t_.m_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<707>";
			if(dbg_object(t_layer).f_index>=0){
				pop_err();
				return;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<708>";
			t_layer.m_Render2(0.0,0.0);
		}
	}
	pop_err();
}
bb_framework_Screen.prototype.m_Render=function(){
}
bb_framework_Screen.prototype.m_RenderForegroundLayers=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<714>";
	if((this.f_layers)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<715>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<715>";
		var t_=this.f_layers.m_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<715>";
		while(t_.m_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<715>";
			var t_layer=t_.m_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<716>";
			if(dbg_object(t_layer).f_index>=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<717>";
				t_layer.m_Render2(0.0,0.0);
			}
		}
	}
	pop_err();
}
bb_framework_Screen.prototype.m_ExtraRender=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_DebugRender=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnTouchHit=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnTouchClick=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnTouchFling=function(t_releaseX,t_releaseY,t_velocityX,t_velocityY,t_velocitySpeed,t_pointer){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnTouchReleased=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnTouchDragged=function(t_x,t_y,t_dx,t_dy,t_pointer){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnTouchLongPress=function(t_x,t_y,t_pointer){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnAnyKeyHit=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnKeyHit=function(t_key){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnAnyKeyDown=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnKeyDown=function(t_key){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnAnyKeyReleased=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnKeyReleased=function(t_key){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnMouseHit=function(t_x,t_y,t_button){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnMouseDown=function(t_x,t_y,t_button){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_OnMouseReleased=function(t_x,t_y,t_button){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_Kill=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_Start=function(){
}
bb_framework_Screen.prototype.m_PreStart=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<671>";
	dbg_object(bb_framework_diddyGame).f_currentScreen=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<672>";
	if(this.f_autoFadeIn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<673>";
		this.f_autoFadeIn=false;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<674>";
		dbg_object(bb_framework_diddyGame).f_screenFade.m_Start2(this.f_autoFadeInTime,false,this.f_autoFadeInSound,this.f_autoFadeInMusic,true);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<678>";
	var t_tmpImage=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<679>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<679>";
	var t_=dbg_object(bb_framework_diddyGame).f_images.m_Keys().m_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<679>";
	while(t_.m_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<679>";
		var t_key=t_.m_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<680>";
		var t_i=dbg_object(bb_framework_diddyGame).f_images.m_Get(t_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<681>";
		if(dbg_object(t_i).f_preLoad && dbg_object(t_i).f_screenName.toUpperCase()==this.f_name.toUpperCase()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<682>";
			if(dbg_object(t_i).f_frames>1){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<683>";
				t_i.m_LoadAnim(dbg_object(t_i).f_path,dbg_object(t_i).f_w,dbg_object(t_i).f_h,dbg_object(t_i).f_frames,t_tmpImage,dbg_object(t_i).f_midhandle,dbg_object(t_i).f_readPixels,dbg_object(t_i).f_maskRed,dbg_object(t_i).f_maskGreen,dbg_object(t_i).f_maskBlue,false,dbg_object(t_i).f_screenName);
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<685>";
				t_i.m_Load(dbg_object(t_i).f_path,dbg_object(t_i).f_midhandle,dbg_object(t_i).f_readPixels,dbg_object(t_i).f_maskRed,dbg_object(t_i).f_maskGreen,dbg_object(t_i).f_maskBlue,false,dbg_object(t_i).f_screenName);
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<691>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<691>";
	var t_2=dbg_object(bb_framework_diddyGame).f_sounds.m_Keys().m_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<691>";
	while(t_2.m_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<691>";
		var t_key2=t_2.m_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<692>";
		var t_i2=dbg_object(bb_framework_diddyGame).f_sounds.m_Get(t_key2);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<693>";
		if(dbg_object(t_i2).f_preLoad && dbg_object(t_i2).f_screenName.toUpperCase()==this.f_name.toUpperCase()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<694>";
			t_i2.m_Load2(dbg_object(t_i2).f_path,false,dbg_object(t_i2).f_screenName);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<699>";
	if(this.f_musicPath!=""){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<699>";
		bb_framework_diddyGame.m_MusicPlay(this.f_musicPath,this.f_musicFlag);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<701>";
	this.m_Start();
	pop_err();
}
bb_framework_Screen.prototype.m_PostFadeOut=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<736>";
	this.m_Kill();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<737>";
	dbg_object(bb_framework_diddyGame).f_nextScreen.m_PreStart();
	pop_err();
}
bb_framework_Screen.prototype.m_PostFadeIn=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_Update2=function(){
}
bb_framework_Screen.prototype.m_Suspend=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_Resume=function(){
	push_err();
	pop_err();
}
bb_framework_Screen.prototype.m_FadeToScreen=function(t_screen,t_fadeTime,t_fadeSound,t_fadeMusic,t_allowScreenUpdate){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<815>";
	if(dbg_object(dbg_object(bb_framework_diddyGame).f_screenFade).f_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<818>";
	if(!((t_screen)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<818>";
		t_screen=(dbg_object(bb_framework_diddyGame).f_exitScreen);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<821>";
	dbg_object(t_screen).f_autoFadeIn=true;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<822>";
	dbg_object(t_screen).f_autoFadeInTime=t_fadeTime;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<823>";
	dbg_object(t_screen).f_autoFadeInSound=t_fadeSound;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<824>";
	dbg_object(t_screen).f_autoFadeInMusic=t_fadeMusic;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<827>";
	dbg_object(bb_framework_diddyGame).f_nextScreen=t_screen;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<828>";
	dbg_object(bb_framework_diddyGame).f_screenFade.m_Start2(t_fadeTime,true,t_fadeSound,t_fadeMusic,t_allowScreenUpdate);
	pop_err();
}
function bb_framework_ExitScreen(){
	bb_framework_Screen.call(this);
}
bb_framework_ExitScreen.prototype=extend_class(bb_framework_Screen);
function bb_framework_ExitScreen_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<641>";
	bb_framework_Screen_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<642>";
	this.f_name="exit";
	pop_err();
	return this;
}
bb_framework_ExitScreen.prototype.m_Start=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<646>";
	bb_functions_ExitApp();
	pop_err();
}
bb_framework_ExitScreen.prototype.m_Render=function(){
	push_err();
	pop_err();
}
bb_framework_ExitScreen.prototype.m_Update2=function(){
	push_err();
	pop_err();
}
function bb_framework_ScreenFade(){
	Object.call(this);
	this.f_active=false;
	this.f_ratio=0.0;
	this.f_counter=.0;
	this.f_fadeTime=.0;
	this.f_fadeMusic=false;
	this.f_fadeOut=false;
	this.f_fadeSound=false;
	this.f_allowScreenUpdate=false;
}
function bb_framework_ScreenFade_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<557>";
	pop_err();
	return this;
}
bb_framework_ScreenFade.prototype.m_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<629>";
	if(!this.f_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<630>";
	bb_graphics_SetAlpha(1.0-this.f_ratio);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<631>";
	bb_graphics_SetColor(0.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<632>";
	bb_graphics_DrawRect(0.0,0.0,bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<633>";
	bb_graphics_SetAlpha(1.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<634>";
	bb_graphics_SetColor(255.0,255.0,255.0);
	pop_err();
}
bb_framework_ScreenFade.prototype.m_CalcRatio=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<610>";
	this.f_ratio=this.f_counter/this.f_fadeTime;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<611>";
	if(this.f_ratio<0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<612>";
		this.f_ratio=0.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<613>";
		if(this.f_fadeMusic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<614>";
			bb_framework_diddyGame.m_SetMojoMusicVolume(0.0);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<617>";
	if(this.f_ratio>1.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<618>";
		this.f_ratio=1.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<619>";
		if(this.f_fadeMusic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<620>";
			bb_framework_diddyGame.m_SetMojoMusicVolume((dbg_object(bb_framework_diddyGame).f_musicVolume)/100.0);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<623>";
	if(this.f_fadeOut){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<624>";
		this.f_ratio=1.0-this.f_ratio;
	}
	pop_err();
}
bb_framework_ScreenFade.prototype.m_Start2=function(t_fadeTime,t_fadeOut,t_fadeSound,t_fadeMusic,t_allowScreenUpdate){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<568>";
	if(this.f_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<569>";
	this.f_active=true;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<570>";
	dbg_object(this).f_fadeTime=bb_framework_diddyGame.m_CalcAnimLength((t_fadeTime)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<571>";
	dbg_object(this).f_fadeOut=t_fadeOut;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<572>";
	dbg_object(this).f_fadeMusic=t_fadeMusic;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<573>";
	dbg_object(this).f_fadeSound=t_fadeSound;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<574>";
	dbg_object(this).f_allowScreenUpdate=t_allowScreenUpdate;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<575>";
	if(t_fadeOut){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<576>";
		this.f_ratio=1.0;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<578>";
		this.f_ratio=0.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<580>";
		if(dbg_object(this).f_fadeMusic){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<581>";
			bb_framework_diddyGame.m_SetMojoMusicVolume(0.0);
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<584>";
	this.f_counter=0.0;
	pop_err();
}
bb_framework_ScreenFade.prototype.m_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<588>";
	if(!this.f_active){
		pop_err();
		return;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<589>";
	this.f_counter+=dbg_object(bb_framework_dt).f_delta;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<590>";
	this.m_CalcRatio();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<591>";
	if(this.f_fadeSound){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<592>";
		for(var t_i=0;t_i<=31;t_i=t_i+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<593>";
			bb_audio_SetChannelVolume(t_i,this.f_ratio*((dbg_object(bb_framework_diddyGame).f_soundVolume)/100.0));
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<596>";
	if(this.f_fadeMusic){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<597>";
		bb_framework_diddyGame.m_SetMojoMusicVolume(this.f_ratio*((dbg_object(bb_framework_diddyGame).f_musicVolume)/100.0));
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<599>";
	if(this.f_counter>this.f_fadeTime){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<600>";
		this.f_active=false;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<601>";
		if(this.f_fadeOut){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<602>";
			dbg_object(bb_framework_diddyGame).f_currentScreen.m_PostFadeOut();
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<604>";
			dbg_object(bb_framework_diddyGame).f_currentScreen.m_PostFadeIn();
		}
	}
	pop_err();
}
function bb_framework_GameImage(){
	Object.call(this);
	this.f_image=null;
	this.f_w=0;
	this.f_h=0;
	this.f_preLoad=false;
	this.f_screenName="";
	this.f_frames=0;
	this.f_path="";
	this.f_midhandle=false;
	this.f_readPixels=false;
	this.f_maskRed=0;
	this.f_maskGreen=0;
	this.f_maskBlue=0;
	this.f_name="";
	this.f_w2=.0;
	this.f_h2=.0;
	this.f_midhandled=0;
	this.f_pixels=[];
}
bb_framework_GameImage.prototype.m_Draw=function(t_x,t_y,t_rotation,t_scaleX,t_scaleY,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1282>";
	bb_graphics_DrawImage2(dbg_object(this).f_image,t_x,t_y,t_rotation,t_scaleX,t_scaleY,t_frame);
	pop_err();
}
bb_framework_GameImage.prototype.m_CalcSize=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1255>";
	if(this.f_image!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1256>";
		this.f_w=this.f_image.m_Width();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1257>";
		this.f_h=this.f_image.m_Height();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1258>";
		this.f_w2=((this.f_w/2)|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1259>";
		this.f_h2=((this.f_h/2)|0);
	}
	pop_err();
}
bb_framework_GameImage.prototype.m_MidHandle=function(t_midhandle){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1264>";
	if(t_midhandle){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1265>";
		this.f_image.m_SetHandle(this.f_w2,this.f_h2);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1266>";
		dbg_object(this).f_midhandled=1;
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1268>";
		this.f_image.m_SetHandle(0.0,0.0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1269>";
		dbg_object(this).f_midhandled=0;
	}
	pop_err();
}
bb_framework_GameImage.prototype.m_MidHandle2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1278>";
	var t_=dbg_object(this).f_midhandled==1;
	pop_err();
	return t_;
}
bb_framework_GameImage.prototype.m_SetMaskColor=function(t_r,t_g,t_b){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1200>";
	this.f_maskRed=t_r;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1201>";
	this.f_maskGreen=t_g;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1202>";
	this.f_maskBlue=t_b;
	pop_err();
}
bb_framework_GameImage.prototype.m_LoadAnim=function(t_file,t_w,t_h,t_total,t_tmpImage,t_midhandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue,t_preLoad,t_screenName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1222>";
	this.f_name=bb_functions_StripAll(t_file.toUpperCase());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1223>";
	this.f_path=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1224>";
	dbg_object(this).f_midhandle=t_midhandle;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1225>";
	dbg_object(this).f_preLoad=t_preLoad;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1226>";
	dbg_object(this).f_screenName=t_screenName.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1227>";
	dbg_object(this).f_w=t_w;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1228>";
	dbg_object(this).f_h=t_h;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1229>";
	dbg_object(this).f_frames=t_total;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1230>";
	if(!t_preLoad){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1231>";
		this.f_image=bb_functions_LoadAnimBitmap(t_file,t_w,t_h,t_total,t_tmpImage);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1232>";
		this.m_CalcSize();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1233>";
		this.m_MidHandle(t_midhandle);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1234>";
		this.f_pixels=new_number_array(this.f_image.m_Width()*this.f_image.m_Height());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1235>";
		dbg_object(this).f_readPixels=t_readPixels;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1237>";
	this.m_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
	pop_err();
}
bb_framework_GameImage.prototype.m_Load=function(t_file,t_midhandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue,t_preLoad,t_screenName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1206>";
	this.f_name=bb_functions_StripAll(t_file.toUpperCase());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1207>";
	this.f_path=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1208>";
	dbg_object(this).f_midhandle=t_midhandle;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1209>";
	dbg_object(this).f_preLoad=t_preLoad;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1210>";
	dbg_object(this).f_screenName=t_screenName.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1211>";
	if(!t_preLoad){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1212>";
		this.f_image=bb_functions_LoadBitmap(t_file,0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1213>";
		this.m_CalcSize();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1214>";
		this.m_MidHandle(t_midhandle);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1215>";
		this.f_pixels=new_number_array(this.f_image.m_Width()*this.f_image.m_Height());
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1216>";
		dbg_object(this).f_readPixels=t_readPixels;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1218>";
	this.m_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
	pop_err();
}
function bb_map_Map2(){
	Object.call(this);
	this.f_root=null;
}
function bb_map_Map2_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
bb_map_Map2.prototype.m_Keys=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>";
	var t_=bb_map_MapKeys_new.call(new bb_map_MapKeys,this);
	pop_err();
	return t_;
}
bb_map_Map2.prototype.m_FirstNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
	if(!((this.f_root)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>";
	var t_node=this.f_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>";
	while((dbg_object(t_node).f_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>";
		t_node=dbg_object(t_node).f_left;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>";
	pop_err();
	return t_node;
}
bb_map_Map2.prototype.m_Compare=function(t_lhs,t_rhs){
}
bb_map_Map2.prototype.m_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.f_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.m_Compare(t_key,dbg_object(t_node).f_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).f_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).f_left;
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
bb_map_Map2.prototype.m_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.m_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).f_value;
	}
	pop_err();
	return null;
}
function bb_map_StringMap2(){
	bb_map_Map2.call(this);
}
bb_map_StringMap2.prototype=extend_class(bb_map_Map2);
function bb_map_StringMap2_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	bb_map_Map2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
bb_map_StringMap2.prototype.m_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function bb_framework_ImageBank(){
	bb_map_StringMap2.call(this);
}
bb_framework_ImageBank.prototype=extend_class(bb_map_StringMap2);
function bb_framework_ImageBank_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<882>";
	bb_map_StringMap2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<882>";
	pop_err();
	return this;
}
bb_framework_ImageBank.prototype.m_Find=function(t_name){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1090>";
	t_name=t_name.toUpperCase();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1093>";
	if(dbg_object(bb_framework_diddyGame).f_debugOn){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1094>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1094>";
		var t_=this.m_Keys().m_ObjectEnumerator();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1094>";
		while(t_.m_HasNext()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1094>";
			var t_key=t_.m_NextObject();
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1095>";
			var t_i=this.m_Get(t_key);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1096>";
			if(!dbg_object(t_i).f_preLoad){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1097>";
				print(t_key+" is stored in the image map.");
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1101>";
	var t_i2=this.m_Get(t_name);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1102>";
	bb_assert_AssertNotNull((t_i2),"Image '"+t_name+"' not found in the ImageBank");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1103>";
	if(dbg_object(t_i2).f_preLoad && dbg_object(t_i2).f_image==null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1103>";
		bb_assert_AssertError("Image '"+t_name+"' not found in the ImageBank");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1104>";
	pop_err();
	return t_i2;
}
function bb_framework_GameSound(){
	Object.call(this);
	this.f_preLoad=false;
	this.f_screenName="";
	this.f_path="";
	this.f_sound=null;
	this.f_name="";
}
bb_framework_GameSound.prototype.m_Load2=function(t_file,t_preLoad,t_screenName){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1483>";
	dbg_object(this).f_path=t_file;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1484>";
	dbg_object(this).f_preLoad=t_preLoad;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1485>";
	dbg_object(this).f_screenName=t_screenName;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1486>";
	if(!t_preLoad){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1487>";
		if((t_file.indexOf(".wav")!=-1) || (t_file.indexOf(".ogg")!=-1) || (t_file.indexOf(".mp3")!=-1) || (t_file.indexOf(".m4a")!=-1) || (t_file.indexOf(".wma")!=-1)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1488>";
			this.f_sound=bb_functions_LoadSoundSample(bb_framework_SoundBank_path+t_file);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1495>";
			this.f_sound=bb_functions_LoadSoundSample(bb_framework_SoundBank_path+t_file+".wav");
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1499>";
	this.f_name=bb_functions_StripAll(t_file.toUpperCase());
	pop_err();
}
function bb_map_Map3(){
	Object.call(this);
	this.f_root=null;
}
function bb_map_Map3_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
bb_map_Map3.prototype.m_Keys=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>";
	var t_=bb_map_MapKeys2_new.call(new bb_map_MapKeys2,this);
	pop_err();
	return t_;
}
bb_map_Map3.prototype.m_FirstNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
	if(!((this.f_root)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>";
	var t_node=this.f_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>";
	while((dbg_object(t_node).f_left)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>";
		t_node=dbg_object(t_node).f_left;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>";
	pop_err();
	return t_node;
}
bb_map_Map3.prototype.m_Compare=function(t_lhs,t_rhs){
}
bb_map_Map3.prototype.m_FindNode=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>";
	var t_node=this.f_root;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>";
	while((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>";
		var t_cmp=this.m_Compare(t_key,dbg_object(t_node).f_key);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>";
		if(t_cmp>0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>";
			t_node=dbg_object(t_node).f_right;
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>";
			if(t_cmp<0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>";
				t_node=dbg_object(t_node).f_left;
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
bb_map_Map3.prototype.m_Get=function(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>";
	var t_node=this.m_FindNode(t_key);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
	if((t_node)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>";
		pop_err();
		return dbg_object(t_node).f_value;
	}
	pop_err();
	return null;
}
function bb_map_StringMap3(){
	bb_map_Map3.call(this);
}
bb_map_StringMap3.prototype=extend_class(bb_map_Map3);
function bb_map_StringMap3_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	bb_map_Map3_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
bb_map_StringMap3.prototype.m_Compare=function(t_lhs,t_rhs){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>";
	var t_=string_compare(t_lhs,t_rhs);
	pop_err();
	return t_;
}
function bb_framework_SoundBank(){
	bb_map_StringMap3.call(this);
}
bb_framework_SoundBank.prototype=extend_class(bb_map_StringMap3);
function bb_framework_SoundBank_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1425>";
	bb_map_StringMap3_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1425>";
	pop_err();
	return this;
}
var bb_framework_SoundBank_path;
function bb_map_Map4(){
	Object.call(this);
}
function bb_map_Map4_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>";
	pop_err();
	return this;
}
function bb_map_StringMap4(){
	bb_map_Map4.call(this);
}
bb_map_StringMap4.prototype=extend_class(bb_map_Map4);
function bb_map_StringMap4_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	bb_map_Map4_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>";
	pop_err();
	return this;
}
function bb_framework_Screens(){
	bb_map_StringMap4.call(this);
}
bb_framework_Screens.prototype=extend_class(bb_map_StringMap4);
function bb_framework_Screens_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<539>";
	bb_map_StringMap4_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<539>";
	pop_err();
	return this;
}
function bb_inputcache_InputCache(){
	Object.call(this);
	this.f_keyHitEnumerator=null;
	this.f_keyDownEnumerator=null;
	this.f_keyReleasedEnumerator=null;
	this.f_keyHitWrapper=null;
	this.f_keyDownWrapper=null;
	this.f_keyReleasedWrapper=null;
	this.f_touchData=new_object_array(32);
	this.f_monitorTouch=false;
	this.f_monitorMouse=false;
	this.f_touchDownCount=0;
	this.f_touchHitCount=0;
	this.f_touchReleasedCount=0;
	this.f_maxTouchDown=-1;
	this.f_maxTouchHit=-1;
	this.f_maxTouchReleased=-1;
	this.f_minTouchDown=-1;
	this.f_minTouchHit=-1;
	this.f_minTouchReleased=-1;
	this.f_touchHit=new_number_array(32);
	this.f_touchHitTime=new_number_array(32);
	this.f_touchDown=new_number_array(32);
	this.f_touchDownTime=new_number_array(32);
	this.f_touchReleasedTime=new_number_array(32);
	this.f_touchReleased=new_number_array(32);
	this.f_touchX=new_number_array(32);
	this.f_touchY=new_number_array(32);
	this.f_currentTouchDown=new_number_array(32);
	this.f_currentTouchHit=new_number_array(32);
	this.f_currentTouchReleased=new_number_array(32);
	this.f_mouseDownCount=0;
	this.f_mouseHitCount=0;
	this.f_mouseReleasedCount=0;
	this.f_mouseX=0;
	this.f_mouseY=0;
	this.f_mouseHit=new_number_array(3);
	this.f_mouseHitTime=new_number_array(3);
	this.f_mouseDown=new_number_array(3);
	this.f_mouseDownTime=new_number_array(3);
	this.f_mouseReleasedTime=new_number_array(3);
	this.f_mouseReleased=new_number_array(3);
	this.f_currentMouseDown=new_number_array(3);
	this.f_currentMouseHit=new_number_array(3);
	this.f_currentMouseReleased=new_number_array(3);
	this.f_keyDownCount=0;
	this.f_keyHitCount=0;
	this.f_keyReleasedCount=0;
	this.f_monitorKeyCount=0;
	this.f_monitorKey=new_bool_array(512);
	this.f_keyHit=new_number_array(512);
	this.f_keyHitTime=new_number_array(512);
	this.f_keyDown=new_number_array(512);
	this.f_keyDownTime=new_number_array(512);
	this.f_keyReleasedTime=new_number_array(512);
	this.f_keyReleased=new_number_array(512);
	this.f_currentKeysDown=new_number_array(512);
	this.f_currentKeysHit=new_number_array(512);
	this.f_currentKeysReleased=new_number_array(512);
	this.f_flingThreshold=250.0;
	this.f_longPressTime=1000;
}
function bb_inputcache_InputCache_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<183>";
	this.f_keyHitEnumerator=bb_inputcache_KeyEventEnumerator_new.call(new bb_inputcache_KeyEventEnumerator,this,3);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<184>";
	this.f_keyDownEnumerator=bb_inputcache_KeyEventEnumerator_new.call(new bb_inputcache_KeyEventEnumerator,this,1);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<185>";
	this.f_keyReleasedEnumerator=bb_inputcache_KeyEventEnumerator_new.call(new bb_inputcache_KeyEventEnumerator,this,2);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<186>";
	this.f_keyHitWrapper=bb_inputcache_EnumWrapper_new.call(new bb_inputcache_EnumWrapper,this.f_keyHitEnumerator);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<187>";
	this.f_keyDownWrapper=bb_inputcache_EnumWrapper_new.call(new bb_inputcache_EnumWrapper,this.f_keyDownEnumerator);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<188>";
	this.f_keyReleasedWrapper=bb_inputcache_EnumWrapper_new.call(new bb_inputcache_EnumWrapper,this.f_keyReleasedEnumerator);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<189>";
	for(var t_i=0;t_i<this.f_touchData.length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<190>";
		dbg_array(this.f_touchData,t_i)[dbg_index]=bb_inputcache_TouchData_new.call(new bb_inputcache_TouchData)
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<196>";
	this.f_monitorTouch=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<197>";
	this.f_monitorMouse=true;
	pop_err();
	return this;
}
bb_inputcache_InputCache.prototype.m_ReadInput=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<290>";
	var t_newval=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<291>";
	var t_now=bb_app_Millisecs();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<294>";
	if(this.f_monitorTouch){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<295>";
		this.f_touchDownCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<296>";
		this.f_touchHitCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<297>";
		this.f_touchReleasedCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<298>";
		this.f_maxTouchDown=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<299>";
		this.f_maxTouchHit=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<300>";
		this.f_maxTouchReleased=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<301>";
		this.f_minTouchDown=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<302>";
		this.f_minTouchHit=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<303>";
		this.f_minTouchReleased=-1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<304>";
		for(var t_i=0;t_i<32;t_i=t_i+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<306>";
			t_newval=bb_input_TouchHit(t_i);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<307>";
			if(!((dbg_array(this.f_touchHit,t_i)[dbg_index])!=0) && ((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<308>";
				dbg_array(this.f_touchHitTime,t_i)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<310>";
			dbg_array(this.f_touchHit,t_i)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<312>";
			t_newval=bb_input_TouchDown(t_i);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<313>";
			if(((t_newval)!=0) && !((dbg_array(this.f_touchDown,t_i)[dbg_index])!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<314>";
				dbg_array(this.f_touchDownTime,t_i)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<317>";
			if(((dbg_array(this.f_touchDown,t_i)[dbg_index])!=0) && !((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<318>";
				dbg_array(this.f_touchReleasedTime,t_i)[dbg_index]=t_now
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<319>";
				dbg_array(this.f_touchReleased,t_i)[dbg_index]=1
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<321>";
				dbg_array(this.f_touchReleased,t_i)[dbg_index]=0
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<323>";
			dbg_array(this.f_touchDown,t_i)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<325>";
			dbg_array(this.f_touchX,t_i)[dbg_index]=bb_input_TouchX(t_i)
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<326>";
			dbg_array(this.f_touchY,t_i)[dbg_index]=bb_input_TouchY(t_i)
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<328>";
			if((dbg_array(this.f_touchDown,t_i)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<329>";
				dbg_array(this.f_currentTouchDown,this.f_touchDownCount)[dbg_index]=t_i
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<330>";
				this.f_touchDownCount+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<331>";
				if(this.f_minTouchDown<0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<331>";
					this.f_minTouchDown=t_i;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<332>";
				this.f_maxTouchDown=t_i;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<334>";
			if((dbg_array(this.f_touchHit,t_i)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<335>";
				dbg_array(this.f_currentTouchHit,this.f_touchHitCount)[dbg_index]=t_i
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<336>";
				this.f_touchHitCount+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<337>";
				if(this.f_minTouchHit<0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<337>";
					this.f_minTouchHit=t_i;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<338>";
				this.f_maxTouchHit=t_i;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<340>";
			if((dbg_array(this.f_touchReleased,t_i)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<341>";
				dbg_array(this.f_currentTouchReleased,this.f_touchReleasedCount)[dbg_index]=t_i
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<342>";
				this.f_touchReleasedCount+=1;
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<343>";
				if(this.f_minTouchReleased<0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<343>";
					this.f_minTouchReleased=t_i;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<344>";
				this.f_maxTouchReleased=t_i;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<350>";
	if(this.f_monitorMouse){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<351>";
		this.f_mouseDownCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<352>";
		this.f_mouseHitCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<353>";
		this.f_mouseReleasedCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<354>";
		this.f_mouseX=dbg_object(bb_framework_diddyGame).f_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<355>";
		this.f_mouseY=dbg_object(bb_framework_diddyGame).f_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<356>";
		for(var t_i2=0;t_i2<3;t_i2=t_i2+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<358>";
			t_newval=bb_input_MouseHit(t_i2);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<359>";
			if(!((dbg_array(this.f_mouseHit,t_i2)[dbg_index])!=0) && ((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<360>";
				dbg_array(this.f_mouseHitTime,t_i2)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<362>";
			dbg_array(this.f_mouseHit,t_i2)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<364>";
			t_newval=bb_input_MouseDown(t_i2);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<365>";
			if(((t_newval)!=0) && !((dbg_array(this.f_mouseDown,t_i2)[dbg_index])!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<366>";
				dbg_array(this.f_mouseDownTime,t_i2)[dbg_index]=t_now
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<369>";
			if(((dbg_array(this.f_mouseDown,t_i2)[dbg_index])!=0) && !((t_newval)!=0)){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<370>";
				dbg_array(this.f_mouseReleasedTime,t_i2)[dbg_index]=t_now
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<371>";
				dbg_array(this.f_mouseReleased,t_i2)[dbg_index]=1
			}else{
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<373>";
				dbg_array(this.f_mouseReleased,t_i2)[dbg_index]=0
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<375>";
			dbg_array(this.f_mouseDown,t_i2)[dbg_index]=t_newval
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<377>";
			if((dbg_array(this.f_mouseDown,t_i2)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<378>";
				dbg_array(this.f_currentMouseDown,this.f_mouseDownCount)[dbg_index]=t_i2
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<379>";
				this.f_mouseDownCount+=1;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<381>";
			if((dbg_array(this.f_mouseHit,t_i2)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<382>";
				dbg_array(this.f_currentMouseHit,this.f_mouseHitCount)[dbg_index]=t_i2
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<383>";
				this.f_mouseHitCount+=1;
			}
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<385>";
			if((dbg_array(this.f_mouseReleased,t_i2)[dbg_index])!=0){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<386>";
				dbg_array(this.f_currentMouseReleased,this.f_mouseReleasedCount)[dbg_index]=t_i2
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<387>";
				this.f_mouseReleasedCount+=1;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<393>";
	this.f_keyDownCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<394>";
	this.f_keyHitCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<395>";
	this.f_keyReleasedCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<396>";
	if(this.f_monitorKeyCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<397>";
		for(var t_i3=8;t_i3<=222;t_i3=t_i3+1){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<398>";
			if(dbg_array(this.f_monitorKey,t_i3)[dbg_index]){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<400>";
				t_newval=bb_input_KeyHit(t_i3);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<401>";
				if(!((dbg_array(this.f_keyHit,t_i3)[dbg_index])!=0) && ((t_newval)!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<402>";
					dbg_array(this.f_keyHitTime,t_i3)[dbg_index]=t_now
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<404>";
				dbg_array(this.f_keyHit,t_i3)[dbg_index]=t_newval
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<406>";
				t_newval=bb_input_KeyDown(t_i3);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<407>";
				if(((t_newval)!=0) && !((dbg_array(this.f_keyDown,t_i3)[dbg_index])!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<408>";
					dbg_array(this.f_keyDownTime,t_i3)[dbg_index]=t_now
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<411>";
				if(((dbg_array(this.f_keyDown,t_i3)[dbg_index])!=0) && !((t_newval)!=0)){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<412>";
					dbg_array(this.f_keyReleasedTime,t_i3)[dbg_index]=t_now
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<413>";
					dbg_array(this.f_keyReleased,t_i3)[dbg_index]=1
				}else{
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<415>";
					dbg_array(this.f_keyReleased,t_i3)[dbg_index]=0
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<417>";
				dbg_array(this.f_keyDown,t_i3)[dbg_index]=t_newval
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<419>";
				if((dbg_array(this.f_keyDown,t_i3)[dbg_index])!=0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<420>";
					dbg_array(this.f_currentKeysDown,this.f_keyDownCount)[dbg_index]=t_i3
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<421>";
					this.f_keyDownCount+=1;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<423>";
				if((dbg_array(this.f_keyHit,t_i3)[dbg_index])!=0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<424>";
					dbg_array(this.f_currentKeysHit,this.f_keyHitCount)[dbg_index]=t_i3
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<425>";
					this.f_keyHitCount+=1;
				}
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<427>";
				if((dbg_array(this.f_keyReleased,t_i3)[dbg_index])!=0){
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<428>";
					dbg_array(this.f_currentKeysReleased,this.f_keyReleasedCount)[dbg_index]=t_i3
					err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<429>";
					this.f_keyReleasedCount+=1;
				}
			}
		}
	}
	pop_err();
}
bb_inputcache_InputCache.prototype.m_HandleEvents=function(t_screen){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<438>";
	for(var t_i=0;t_i<this.f_touchHitCount;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<439>";
		var t_pointer=dbg_array(this.f_currentTouchHit,t_i)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<440>";
		var t_x=((dbg_array(this.f_touchX,t_pointer)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<441>";
		var t_y=((dbg_array(this.f_touchY,t_pointer)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<442>";
		dbg_array(this.f_touchData,t_pointer)[dbg_index].m_Reset(t_x,t_y);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<443>";
		t_screen.m_OnTouchHit(t_x,t_y,t_pointer);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<447>";
	for(var t_i2=0;t_i2<this.f_touchReleasedCount;t_i2=t_i2+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<448>";
		var t_pointer2=dbg_array(this.f_currentTouchReleased,t_i2)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<449>";
		var t_x2=((dbg_array(this.f_touchX,t_pointer2)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<450>";
		var t_y2=((dbg_array(this.f_touchY,t_pointer2)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<451>";
		dbg_array(this.f_touchData,t_pointer2)[dbg_index].m_Update3(t_x2,t_y2);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<452>";
		if(!dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_movedTooFar && !dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_firedLongPress){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<453>";
			t_screen.m_OnTouchClick(t_x2,t_y2,t_pointer2);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<458>";
			if(dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_touchVelocityX*dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_touchVelocityX+dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_touchVelocityY*dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_touchVelocityY>=this.f_flingThreshold*this.f_flingThreshold){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<460>";
				t_screen.m_OnTouchFling(t_x2,t_y2,dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_touchVelocityX,dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_touchVelocityY,dbg_object(dbg_array(this.f_touchData,t_pointer2)[dbg_index]).f_touchVelocitySpeed,t_pointer2);
			}
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<463>";
		t_screen.m_OnTouchReleased(t_x2,t_y2,t_pointer2);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<466>";
	for(var t_i3=0;t_i3<this.f_touchDownCount;t_i3=t_i3+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<467>";
		var t_pointer3=dbg_array(this.f_currentTouchDown,t_i3)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<468>";
		var t_x3=((dbg_array(this.f_touchX,t_pointer3)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<469>";
		var t_y3=((dbg_array(this.f_touchY,t_pointer3)[dbg_index])|0);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<470>";
		dbg_array(this.f_touchData,t_pointer3)[dbg_index].m_Update3(t_x3,t_y3);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<471>";
		t_screen.m_OnTouchDragged(t_x3,t_y3,dbg_object(dbg_array(this.f_touchData,t_pointer3)[dbg_index]).f_distanceMovedX,dbg_object(dbg_array(this.f_touchData,t_pointer3)[dbg_index]).f_distanceMovedY,t_pointer3);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<473>";
		if(!dbg_object(dbg_array(this.f_touchData,t_pointer3)[dbg_index]).f_testedLongPress && dbg_object(bb_framework_dt).f_currentticks-(dbg_object(dbg_array(this.f_touchData,t_pointer3)[dbg_index]).f_firstTouchTime)>=(this.f_longPressTime)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<474>";
			dbg_object(dbg_array(this.f_touchData,t_pointer3)[dbg_index]).f_testedLongPress=true;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<475>";
			if(!dbg_object(dbg_array(this.f_touchData,t_pointer3)[dbg_index]).f_movedTooFar){
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<477>";
				t_screen.m_OnTouchLongPress(t_x3,t_y3,t_pointer3);
				err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<478>";
				dbg_object(dbg_array(this.f_touchData,t_pointer3)[dbg_index]).f_firedLongPress=true;
			}
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<484>";
	if(this.f_keyHitCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<484>";
		t_screen.m_OnAnyKeyHit();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<485>";
	for(var t_i4=0;t_i4<this.f_keyHitCount;t_i4=t_i4+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<486>";
		var t_key=dbg_array(this.f_currentKeysHit,t_i4)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<487>";
		t_screen.m_OnKeyHit(t_key);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<491>";
	if(this.f_keyDownCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<491>";
		t_screen.m_OnAnyKeyDown();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<492>";
	for(var t_i5=0;t_i5<this.f_keyDownCount;t_i5=t_i5+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<493>";
		var t_key2=dbg_array(this.f_currentKeysDown,t_i5)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<494>";
		t_screen.m_OnKeyDown(t_key2);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<498>";
	if(this.f_keyReleasedCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<498>";
		t_screen.m_OnAnyKeyReleased();
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<499>";
	for(var t_i6=0;t_i6<this.f_keyReleasedCount;t_i6=t_i6+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<500>";
		var t_key3=dbg_array(this.f_currentKeysReleased,t_i6)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<501>";
		t_screen.m_OnKeyReleased(t_key3);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<504>";
	for(var t_i7=0;t_i7<this.f_mouseHitCount;t_i7=t_i7+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<505>";
		var t_button=dbg_array(this.f_currentMouseHit,t_i7)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<506>";
		var t_x4=this.f_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<507>";
		var t_y4=this.f_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<508>";
		t_screen.m_OnMouseHit(t_x4,t_y4,t_button);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<511>";
	for(var t_i8=0;t_i8<this.f_mouseDownCount;t_i8=t_i8+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<512>";
		var t_button2=dbg_array(this.f_currentMouseDown,t_i8)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<513>";
		var t_x5=this.f_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<514>";
		var t_y5=this.f_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<515>";
		t_screen.m_OnMouseDown(t_x5,t_y5,t_button2);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<518>";
	for(var t_i9=0;t_i9<this.f_mouseReleasedCount;t_i9=t_i9+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<519>";
		var t_button3=dbg_array(this.f_currentMouseReleased,t_i9)[dbg_index];
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<520>";
		var t_x6=this.f_mouseX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<521>";
		var t_y6=this.f_mouseY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<522>";
		t_screen.m_OnMouseReleased(t_x6,t_y6,t_button3);
	}
	pop_err();
}
function bb_inputcache_InputEventEnumerator(){
	Object.call(this);
	this.f_ic=null;
	this.f_eventType=0;
}
function bb_inputcache_InputEventEnumerator_new(t_ic,t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<587>";
	dbg_object(this).f_ic=t_ic;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<588>";
	dbg_object(this).f_eventType=t_eventType;
	pop_err();
	return this;
}
function bb_inputcache_InputEventEnumerator_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<579>";
	pop_err();
	return this;
}
function bb_inputcache_KeyEventEnumerator(){
	bb_inputcache_InputEventEnumerator.call(this);
	this.f_event=null;
}
bb_inputcache_KeyEventEnumerator.prototype=extend_class(bb_inputcache_InputEventEnumerator);
function bb_inputcache_KeyEventEnumerator_new(t_ic,t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<603>";
	bb_inputcache_InputEventEnumerator_new.call(this,t_ic,t_eventType);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<604>";
	dbg_object(this).f_event=bb_inputcache_KeyEvent_new2.call(new bb_inputcache_KeyEvent);
	pop_err();
	return this;
}
function bb_inputcache_KeyEventEnumerator_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<597>";
	bb_inputcache_InputEventEnumerator_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<597>";
	pop_err();
	return this;
}
function bb_inputcache_InputEvent(){
	Object.call(this);
	this.f_eventType=0;
}
function bb_inputcache_InputEvent_new(t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<554>";
	dbg_object(this).f_eventType=t_eventType;
	pop_err();
	return this;
}
function bb_inputcache_InputEvent_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<528>";
	pop_err();
	return this;
}
function bb_inputcache_KeyEvent(){
	bb_inputcache_InputEvent.call(this);
}
bb_inputcache_KeyEvent.prototype=extend_class(bb_inputcache_InputEvent);
function bb_inputcache_KeyEvent_new(t_eventType){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<573>";
	bb_inputcache_InputEvent_new.call(this,t_eventType);
	pop_err();
	return this;
}
function bb_inputcache_KeyEvent_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<559>";
	bb_inputcache_InputEvent_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<559>";
	pop_err();
	return this;
}
function bb_inputcache_EnumWrapper(){
	Object.call(this);
	this.f_wrappedEnum=null;
}
function bb_inputcache_EnumWrapper_new(t_wrappedEnum){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<644>";
	dbg_object(this).f_wrappedEnum=t_wrappedEnum;
	pop_err();
	return this;
}
function bb_inputcache_EnumWrapper_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<638>";
	pop_err();
	return this;
}
function bb_inputcache_TouchData(){
	Object.call(this);
	this.f_firstTouchX=0;
	this.f_firstTouchY=0;
	this.f_lastTouchX=0;
	this.f_lastTouchY=0;
	this.f_firstTouchTime=0;
	this.f_testedLongPress=false;
	this.f_firedLongPress=false;
	this.f_flingSamplesX=new_number_array(10);
	this.f_flingSamplesY=new_number_array(10);
	this.f_flingSamplesTime=new_number_array(10);
	this.f_flingSampleCount=0;
	this.f_flingSampleNext=0;
	this.f_movedTooFar=false;
	this.f_touchVelocityX=.0;
	this.f_touchVelocityY=.0;
	this.f_touchVelocitySpeed=.0;
	this.f_distanceMovedX=0;
	this.f_distanceMovedY=0;
}
function bb_inputcache_TouchData_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<664>";
	pop_err();
	return this;
}
bb_inputcache_TouchData.prototype.m_AddFlingSample=function(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<711>";
	dbg_array(this.f_flingSamplesX,this.f_flingSampleNext)[dbg_index]=t_x
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<712>";
	dbg_array(this.f_flingSamplesY,this.f_flingSampleNext)[dbg_index]=t_y
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<713>";
	dbg_array(this.f_flingSamplesTime,this.f_flingSampleNext)[dbg_index]=((dbg_object(bb_framework_dt).f_currentticks)|0)
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<714>";
	if(this.f_flingSampleCount<10){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<714>";
		this.f_flingSampleCount+=1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<715>";
	this.f_flingSampleNext+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<716>";
	if(this.f_flingSampleNext>=10){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<716>";
		this.f_flingSampleNext=0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<719>";
	var t_first=this.f_flingSampleNext-this.f_flingSampleCount;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<720>";
	var t_last=this.f_flingSampleNext-1;
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
	if(this.f_flingSampleCount>0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<731>";
		var t_secs=(dbg_array(this.f_flingSamplesTime,t_last)[dbg_index]-dbg_array(this.f_flingSamplesTime,t_first)[dbg_index])/1000.0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<732>";
		this.f_touchVelocityX=(dbg_array(this.f_flingSamplesX,t_last)[dbg_index]-dbg_array(this.f_flingSamplesX,t_first)[dbg_index])/t_secs;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<733>";
		this.f_touchVelocityY=(dbg_array(this.f_flingSamplesY,t_last)[dbg_index]-dbg_array(this.f_flingSamplesY,t_first)[dbg_index])/t_secs;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<734>";
		this.f_touchVelocitySpeed=Math.sqrt(this.f_touchVelocityX*this.f_touchVelocityX+this.f_touchVelocityY*this.f_touchVelocityY);
	}
	pop_err();
}
bb_inputcache_TouchData.prototype.m_Reset=function(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<689>";
	this.f_firstTouchX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<690>";
	this.f_firstTouchY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<691>";
	this.f_lastTouchX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<692>";
	this.f_lastTouchY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<693>";
	this.f_firstTouchTime=((dbg_object(bb_framework_dt).f_currentticks)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<694>";
	this.f_testedLongPress=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<695>";
	this.f_firedLongPress=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<696>";
	for(var t_i=0;t_i<10;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<697>";
		dbg_array(this.f_flingSamplesX,t_i)[dbg_index]=0
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<698>";
		dbg_array(this.f_flingSamplesY,t_i)[dbg_index]=0
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<699>";
		dbg_array(this.f_flingSamplesTime,t_i)[dbg_index]=0
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<701>";
	this.f_flingSampleCount=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<702>";
	this.f_flingSampleNext=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<703>";
	this.f_movedTooFar=false;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<704>";
	this.f_touchVelocityX=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<705>";
	this.f_touchVelocityY=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<706>";
	this.f_touchVelocitySpeed=0.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<707>";
	this.m_AddFlingSample(t_x,t_y);
	pop_err();
}
bb_inputcache_TouchData.prototype.m_Update3=function(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<740>";
	this.f_distanceMovedX=t_x-this.f_lastTouchX;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<741>";
	this.f_distanceMovedY=t_y-this.f_lastTouchY;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<742>";
	this.f_lastTouchX=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<743>";
	this.f_lastTouchY=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<745>";
	this.m_AddFlingSample(t_x,t_y);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<747>";
	if(!this.f_movedTooFar){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<749>";
		var t_dx=t_x-this.f_firstTouchX;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<750>";
		var t_dy=t_y-this.f_firstTouchY;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<751>";
		if((t_dx*t_dx+t_dy*t_dy)>400.0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<752>";
			this.f_movedTooFar=true;
		}
	}
	pop_err();
}
function bb_framework_DiddyMouse(){
	Object.call(this);
	this.f_lastX=0;
	this.f_lastY=0;
}
function bb_framework_DiddyMouse_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1970>";
	diddy.mouseZInit();
	pop_err();
	return this;
}
bb_framework_DiddyMouse.prototype.m_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1985>";
	this.f_lastX=dbg_object(bb_framework_diddyGame).f_mouseX;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1986>";
	this.f_lastY=dbg_object(bb_framework_diddyGame).f_mouseY;
	pop_err();
}
function bbMain(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyShooter.monkey<13>";
	bb_mainClass_Game_new.call(new bb_mainClass_Game);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyShooter.monkey<14>";
	pop_err();
	return 0;
}
function bb_reflection_ConstInfo(){
	Object.call(this);
}
function bb_stack_Stack(){
	Object.call(this);
	this.f_data=[];
	this.f_length=0;
}
function bb_stack_Stack_new(){
	push_err();
	pop_err();
	return this;
}
function bb_stack_Stack_new2(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).f_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).f_length=t_data.length;
	pop_err();
	return this;
}
bb_stack_Stack.prototype.m_Push=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<52>";
	if(this.f_length==this.f_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<53>";
		this.f_data=resize_object_array(this.f_data,this.f_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<55>";
	dbg_array(this.f_data,this.f_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<56>";
	this.f_length+=1;
	pop_err();
	return 0;
}
bb_stack_Stack.prototype.m_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.f_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.f_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.f_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function bb_reflection_FieldInfo(){
	Object.call(this);
	this.f__name="";
	this.f__attrs=0;
	this.f__type=null;
}
function bb_reflection_FieldInfo_new(t_name,t_attrs,t_type){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<155>";
	this.f__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<156>";
	this.f__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<157>";
	this.f__type=t_type;
	pop_err();
	return this;
}
function bb_reflection_FieldInfo_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<152>";
	pop_err();
	return this;
}
function bb_stack_Stack2(){
	Object.call(this);
	this.f_data=[];
	this.f_length=0;
}
function bb_stack_Stack2_new(){
	push_err();
	pop_err();
	return this;
}
function bb_stack_Stack2_new2(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).f_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).f_length=t_data.length;
	pop_err();
	return this;
}
bb_stack_Stack2.prototype.m_Push2=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<52>";
	if(this.f_length==this.f_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<53>";
		this.f_data=resize_object_array(this.f_data,this.f_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<55>";
	dbg_array(this.f_data,this.f_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<56>";
	this.f_length+=1;
	pop_err();
	return 0;
}
bb_stack_Stack2.prototype.m_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.f_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.f_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.f_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function bb_reflection_GlobalInfo(){
	Object.call(this);
}
function bb_stack_Stack3(){
	Object.call(this);
	this.f_data=[];
	this.f_length=0;
}
function bb_stack_Stack3_new(){
	push_err();
	pop_err();
	return this;
}
function bb_stack_Stack3_new2(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).f_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).f_length=t_data.length;
	pop_err();
	return this;
}
bb_stack_Stack3.prototype.m_Push3=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<52>";
	if(this.f_length==this.f_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<53>";
		this.f_data=resize_object_array(this.f_data,this.f_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<55>";
	dbg_array(this.f_data,this.f_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<56>";
	this.f_length+=1;
	pop_err();
	return 0;
}
bb_stack_Stack3.prototype.m_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.f_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.f_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.f_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function bb_reflection_MethodInfo(){
	Object.call(this);
	this.f__name="";
	this.f__attrs=0;
	this.f__retType=null;
	this.f__argTypes=[];
}
function bb_reflection_MethodInfo_new(t_name,t_attrs,t_retType,t_argTypes){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<187>";
	this.f__name=t_name;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<188>";
	this.f__attrs=t_attrs;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<189>";
	this.f__retType=t_retType;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<190>";
	this.f__argTypes=t_argTypes;
	pop_err();
	return this;
}
function bb_reflection_MethodInfo_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<184>";
	pop_err();
	return this;
}
function bb_stack_Stack4(){
	Object.call(this);
	this.f_data=[];
	this.f_length=0;
}
function bb_stack_Stack4_new(){
	push_err();
	pop_err();
	return this;
}
function bb_stack_Stack4_new2(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).f_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).f_length=t_data.length;
	pop_err();
	return this;
}
bb_stack_Stack4.prototype.m_Push4=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<52>";
	if(this.f_length==this.f_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<53>";
		this.f_data=resize_object_array(this.f_data,this.f_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<55>";
	dbg_array(this.f_data,this.f_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<56>";
	this.f_length+=1;
	pop_err();
	return 0;
}
bb_stack_Stack4.prototype.m_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.f_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.f_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.f_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function bb_stack_Stack5(){
	Object.call(this);
	this.f_data=[];
	this.f_length=0;
}
function bb_stack_Stack5_new(){
	push_err();
	pop_err();
	return this;
}
function bb_stack_Stack5_new2(t_data){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>";
	dbg_object(this).f_data=t_data.slice(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>";
	dbg_object(this).f_length=t_data.length;
	pop_err();
	return this;
}
bb_stack_Stack5.prototype.m_Push5=function(t_value){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<52>";
	if(this.f_length==this.f_data.length){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<53>";
		this.f_data=resize_object_array(this.f_data,this.f_length*2+10);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<55>";
	dbg_array(this.f_data,this.f_length)[dbg_index]=t_value
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<56>";
	this.f_length+=1;
	pop_err();
	return 0;
}
bb_stack_Stack5.prototype.m_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>";
	var t_t=new_object_array(this.f_length);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>";
	for(var t_i=0;t_i<this.f_length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>";
		dbg_array(t_t,t_i)[dbg_index]=dbg_array(this.f_data,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>";
	pop_err();
	return t_t;
}
function bb_reflection_R11(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R11.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R11_new(){
	bb_reflection_FieldInfo_new.call(this,"message",2,bb_reflection__stringClass);
	return this;
}
function bb_reflection_R12(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R12.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R12_new(){
	bb_reflection_FieldInfo_new.call(this,"cause",2,dbg_array(bb_reflection__classes,1)[dbg_index]);
	return this;
}
function bb_reflection_R13(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R13.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R13_new(){
	bb_reflection_FieldInfo_new.call(this,"type",2,bb_reflection__stringClass);
	return this;
}
function bb_reflection_R14(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R14.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R14_new(){
	bb_reflection_FieldInfo_new.call(this,"fullType",2,bb_reflection__stringClass);
	return this;
}
function bb_reflection_R15(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R15.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R15_new(){
	bb_reflection_MethodInfo_new.call(this,"Message",8,bb_reflection__stringClass,[]);
	return this;
}
function bb_reflection_R16(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R16.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R16_new(){
	bb_reflection_MethodInfo_new.call(this,"Message",8,null,[bb_reflection__stringClass]);
	return this;
}
function bb_reflection_R17(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R17.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R17_new(){
	bb_reflection_MethodInfo_new.call(this,"Cause",8,dbg_array(bb_reflection__classes,1)[dbg_index],[]);
	return this;
}
function bb_reflection_R18(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R18.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R18_new(){
	bb_reflection_MethodInfo_new.call(this,"Cause",8,null,[dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function bb_reflection_R19(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R19.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R19_new(){
	bb_reflection_MethodInfo_new.call(this,"Type",8,bb_reflection__stringClass,[]);
	return this;
}
function bb_reflection_R20(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R20.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R20_new(){
	bb_reflection_MethodInfo_new.call(this,"FullType",8,bb_reflection__stringClass,[]);
	return this;
}
function bb_reflection_R22(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R22.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R22_new(){
	bb_reflection_MethodInfo_new.call(this,"ToString",0,bb_reflection__stringClass,[bb_reflection__boolClass]);
	return this;
}
function bb_reflection_R21(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R21.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R21_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,2)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function bb_reflection_R24(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R24.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R24_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,3)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function bb_reflection_R26(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R26.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R26_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,4)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function bb_reflection_R28(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R28.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R28_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,5)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function bb_reflection_R30(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R30.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R30_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,6)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function bb_reflection_R32(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R32.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R32_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,7)[dbg_index],[bb_reflection__stringClass,dbg_array(bb_reflection__classes,1)[dbg_index]]);
	return this;
}
function bb_reflection_R34(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R34.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R34_new(){
	bb_reflection_FieldInfo_new.call(this,"value",0,bb_reflection__boolClass);
	return this;
}
function bb_reflection_R36(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R36.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R36_new(){
	bb_reflection_MethodInfo_new.call(this,"ToBool",0,bb_reflection__boolClass,[]);
	return this;
}
function bb_reflection_R37(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R37.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R37_new(){
	bb_reflection_MethodInfo_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,8)[dbg_index]]);
	return this;
}
function bb_reflection_R35(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R35.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R35_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,8)[dbg_index],[bb_reflection__boolClass]);
	return this;
}
function bb_reflection_R38(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R38.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R38_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,8)[dbg_index],[]);
	return this;
}
function bb_reflection_R40(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R40.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R40_new(){
	bb_reflection_FieldInfo_new.call(this,"value",0,bb_reflection__intClass);
	return this;
}
function bb_reflection_R43(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R43.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R43_new(){
	bb_reflection_MethodInfo_new.call(this,"ToInt",0,bb_reflection__intClass,[]);
	return this;
}
function bb_reflection_R44(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R44.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R44_new(){
	bb_reflection_MethodInfo_new.call(this,"ToFloat",0,bb_reflection__floatClass,[]);
	return this;
}
function bb_reflection_R45(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R45.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R45_new(){
	bb_reflection_MethodInfo_new.call(this,"ToString",0,bb_reflection__stringClass,[]);
	return this;
}
function bb_reflection_R46(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R46.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R46_new(){
	bb_reflection_MethodInfo_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,9)[dbg_index]]);
	return this;
}
function bb_reflection_R47(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R47.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R47_new(){
	bb_reflection_MethodInfo_new.call(this,"Compare",0,bb_reflection__intClass,[dbg_array(bb_reflection__classes,9)[dbg_index]]);
	return this;
}
function bb_reflection_R41(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R41.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R41_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,9)[dbg_index],[bb_reflection__intClass]);
	return this;
}
function bb_reflection_R42(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R42.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R42_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,9)[dbg_index],[bb_reflection__floatClass]);
	return this;
}
function bb_reflection_R48(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R48.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R48_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,9)[dbg_index],[]);
	return this;
}
function bb_reflection_R50(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R50.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R50_new(){
	bb_reflection_FieldInfo_new.call(this,"value",0,bb_reflection__floatClass);
	return this;
}
function bb_reflection_R53(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R53.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R53_new(){
	bb_reflection_MethodInfo_new.call(this,"ToInt",0,bb_reflection__intClass,[]);
	return this;
}
function bb_reflection_R54(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R54.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R54_new(){
	bb_reflection_MethodInfo_new.call(this,"ToFloat",0,bb_reflection__floatClass,[]);
	return this;
}
function bb_reflection_R55(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R55.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R55_new(){
	bb_reflection_MethodInfo_new.call(this,"ToString",0,bb_reflection__stringClass,[]);
	return this;
}
function bb_reflection_R56(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R56.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R56_new(){
	bb_reflection_MethodInfo_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,10)[dbg_index]]);
	return this;
}
function bb_reflection_R57(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R57.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R57_new(){
	bb_reflection_MethodInfo_new.call(this,"Compare",0,bb_reflection__intClass,[dbg_array(bb_reflection__classes,10)[dbg_index]]);
	return this;
}
function bb_reflection_R51(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R51.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R51_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,10)[dbg_index],[bb_reflection__intClass]);
	return this;
}
function bb_reflection_R52(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R52.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R52_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,10)[dbg_index],[bb_reflection__floatClass]);
	return this;
}
function bb_reflection_R58(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R58.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R58_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,10)[dbg_index],[]);
	return this;
}
function bb_reflection_R60(){
	bb_reflection_FieldInfo.call(this);
}
bb_reflection_R60.prototype=extend_class(bb_reflection_FieldInfo);
function bb_reflection_R60_new(){
	bb_reflection_FieldInfo_new.call(this,"value",0,bb_reflection__stringClass);
	return this;
}
function bb_reflection_R64(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R64.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R64_new(){
	bb_reflection_MethodInfo_new.call(this,"ToString",0,bb_reflection__stringClass,[]);
	return this;
}
function bb_reflection_R65(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R65.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R65_new(){
	bb_reflection_MethodInfo_new.call(this,"Equals",0,bb_reflection__boolClass,[dbg_array(bb_reflection__classes,11)[dbg_index]]);
	return this;
}
function bb_reflection_R66(){
	bb_reflection_MethodInfo.call(this);
}
bb_reflection_R66.prototype=extend_class(bb_reflection_MethodInfo);
function bb_reflection_R66_new(){
	bb_reflection_MethodInfo_new.call(this,"Compare",0,bb_reflection__intClass,[dbg_array(bb_reflection__classes,11)[dbg_index]]);
	return this;
}
function bb_reflection_R61(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R61.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R61_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[bb_reflection__intClass]);
	return this;
}
function bb_reflection_R62(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R62.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R62_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[bb_reflection__floatClass]);
	return this;
}
function bb_reflection_R63(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R63.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R63_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[bb_reflection__stringClass]);
	return this;
}
function bb_reflection_R67(){
	bb_reflection_FunctionInfo.call(this);
}
bb_reflection_R67.prototype=extend_class(bb_reflection_FunctionInfo);
function bb_reflection_R67_new(){
	bb_reflection_FunctionInfo_new.call(this,"new",0,dbg_array(bb_reflection__classes,11)[dbg_index],[]);
	return this;
}
function bb_reflection_UnknownClass(){
	bb_reflection_ClassInfo.call(this);
}
bb_reflection_UnknownClass.prototype=extend_class(bb_reflection_ClassInfo);
function bb_reflection_UnknownClass_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<669>";
	bb_reflection_ClassInfo_new.call(this,"?",0,null,[]);
	pop_err();
	return this;
}
var bb_reflection__unknownClass;
function bb_graphics_Image(){
	Object.call(this);
	this.f_surface=null;
	this.f_width=0;
	this.f_height=0;
	this.f_frames=[];
	this.f_flags=0;
	this.f_tx=.0;
	this.f_ty=.0;
	this.f_source=null;
}
var bb_graphics_Image_DefaultFlags;
function bb_graphics_Image_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<70>";
	pop_err();
	return this;
}
bb_graphics_Image.prototype.m_SetHandle=function(t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<116>";
	dbg_object(this).f_tx=t_tx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<117>";
	dbg_object(this).f_ty=t_ty;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<118>";
	dbg_object(this).f_flags=dbg_object(this).f_flags&-2;
	pop_err();
	return 0;
}
bb_graphics_Image.prototype.m_ApplyFlags=function(t_iflags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<209>";
	this.f_flags=t_iflags;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<211>";
	if((this.f_flags&2)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<212>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<212>";
		var t_=this.f_frames;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<212>";
		var t_2=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<212>";
		while(t_2<t_.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<212>";
			var t_f=dbg_array(t_,t_2)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<212>";
			t_2=t_2+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<213>";
			dbg_object(t_f).f_x+=1;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<215>";
		this.f_width-=2;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<218>";
	if((this.f_flags&4)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>";
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>";
		var t_3=this.f_frames;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>";
		var t_4=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>";
		while(t_4<t_3.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>";
			var t_f2=dbg_array(t_3,t_4)[dbg_index];
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>";
			t_4=t_4+1;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<220>";
			dbg_object(t_f2).f_y+=1;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<222>";
		this.f_height-=2;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<225>";
	if((this.f_flags&1)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<226>";
		this.m_SetHandle((this.f_width)/2.0,(this.f_height)/2.0);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<229>";
	if(this.f_frames.length==1 && dbg_object(dbg_array(this.f_frames,0)[dbg_index]).f_x==0 && dbg_object(dbg_array(this.f_frames,0)[dbg_index]).f_y==0 && this.f_width==this.f_surface.Width() && this.f_height==this.f_surface.Height()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<230>";
		this.f_flags|=65536;
	}
	pop_err();
	return 0;
}
bb_graphics_Image.prototype.m_Load3=function(t_path,t_nframes,t_iflags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<164>";
	this.f_surface=dbg_object(bb_graphics_context).f_device.LoadSurface(t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<165>";
	if(!((this.f_surface)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<165>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<167>";
	this.f_width=((this.f_surface.Width()/t_nframes)|0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<168>";
	this.f_height=this.f_surface.Height();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<170>";
	this.f_frames=new_object_array(t_nframes);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<172>";
	for(var t_i=0;t_i<t_nframes;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<173>";
		dbg_array(this.f_frames,t_i)[dbg_index]=bb_graphics_Frame_new.call(new bb_graphics_Frame,t_i*this.f_width,0)
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<176>";
	this.m_ApplyFlags(t_iflags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<177>";
	pop_err();
	return this;
}
bb_graphics_Image.prototype.m_Grab=function(t_x,t_y,t_iwidth,t_iheight,t_nframes,t_iflags,t_source){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<182>";
	dbg_object(this).f_source=t_source;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<183>";
	this.f_surface=dbg_object(t_source).f_surface;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<185>";
	this.f_width=t_iwidth;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<186>";
	this.f_height=t_iheight;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<188>";
	this.f_frames=new_object_array(t_nframes);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<190>";
	var t_ix=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<190>";
	var t_iy=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<192>";
	for(var t_i=0;t_i<t_nframes;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<193>";
		if(t_ix+this.f_width>dbg_object(t_source).f_width){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<194>";
			t_ix=0;
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<195>";
			t_iy+=this.f_height;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<197>";
		if(t_ix+this.f_width>dbg_object(t_source).f_width || t_iy+this.f_height>dbg_object(t_source).f_height){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>";
			error("Image frame outside surface");
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<200>";
		dbg_array(this.f_frames,t_i)[dbg_index]=bb_graphics_Frame_new.call(new bb_graphics_Frame,t_ix+dbg_object(dbg_array(dbg_object(t_source).f_frames,0)[dbg_index]).f_x,t_iy+dbg_object(dbg_array(dbg_object(t_source).f_frames,0)[dbg_index]).f_y)
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<201>";
		t_ix+=this.f_width;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<204>";
	this.m_ApplyFlags(t_iflags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<205>";
	pop_err();
	return this;
}
bb_graphics_Image.prototype.m_GrabImage=function(t_x,t_y,t_width,t_height,t_frames,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<111>";
	if(dbg_object(this).f_frames.length!=1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<111>";
		pop_err();
		return null;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<112>";
	var t_=(bb_graphics_Image_new.call(new bb_graphics_Image)).m_Grab(t_x,t_y,t_width,t_height,t_frames,t_flags,this);
	pop_err();
	return t_;
}
bb_graphics_Image.prototype.m_HandleX=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<103>";
	pop_err();
	return this.f_tx;
}
bb_graphics_Image.prototype.m_HandleY=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<107>";
	pop_err();
	return this.f_ty;
}
bb_graphics_Image.prototype.m_Width=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<83>";
	pop_err();
	return this.f_width;
}
bb_graphics_Image.prototype.m_Height=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<87>";
	pop_err();
	return this.f_height;
}
bb_graphics_Image.prototype.m_Frames=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<95>";
	var t_=this.f_frames.length;
	pop_err();
	return t_;
}
function bb_graphics_Frame(){
	Object.call(this);
	this.f_x=0;
	this.f_y=0;
}
function bb_graphics_Frame_new(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<62>";
	dbg_object(this).f_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<63>";
	dbg_object(this).f_y=t_y;
	pop_err();
	return this;
}
function bb_graphics_Frame_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<57>";
	pop_err();
	return this;
}
function bb_graphics_LoadImage(t_path,t_frameCount,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<309>";
	var t_=(bb_graphics_Image_new.call(new bb_graphics_Image)).m_Load3(t_path,t_frameCount,t_flags);
	pop_err();
	return t_;
}
function bb_graphics_LoadImage2(t_path,t_frameWidth,t_frameHeight,t_frameCount,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<317>";
	var t_atlas=(bb_graphics_Image_new.call(new bb_graphics_Image)).m_Load3(t_path,1,0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<318>";
	if((t_atlas)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<318>";
		var t_=t_atlas.m_GrabImage(0,0,t_frameWidth,t_frameHeight,t_frameCount,t_flags);
		pop_err();
		return t_;
	}
	pop_err();
	return null;
}
function bb_graphics_SetFont(t_font,t_firstChar){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<596>";
	if(!((t_font)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<597>";
		if(!((dbg_object(bb_graphics_context).f_defaultFont)!=null)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<598>";
			dbg_object(bb_graphics_context).f_defaultFont=bb_graphics_LoadImage("mojo_font.png",96,2);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<600>";
		t_font=dbg_object(bb_graphics_context).f_defaultFont;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<601>";
		t_firstChar=32;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<603>";
	dbg_object(bb_graphics_context).f_font=t_font;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<604>";
	dbg_object(bb_graphics_context).f_firstChar=t_firstChar;
	pop_err();
	return 0;
}
var bb_graphics_renderDevice;
function bb_graphics_SetMatrix(t_ix,t_iy,t_jx,t_jy,t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<367>";
	dbg_object(bb_graphics_context).f_ix=t_ix;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<368>";
	dbg_object(bb_graphics_context).f_iy=t_iy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<369>";
	dbg_object(bb_graphics_context).f_jx=t_jx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<370>";
	dbg_object(bb_graphics_context).f_jy=t_jy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<371>";
	dbg_object(bb_graphics_context).f_tx=t_tx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<372>";
	dbg_object(bb_graphics_context).f_ty=t_ty;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<373>";
	dbg_object(bb_graphics_context).f_tformed=((t_ix!=1.0 || t_iy!=0.0 || t_jx!=0.0 || t_jy!=1.0 || t_tx!=0.0 || t_ty!=0.0)?1:0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<374>";
	dbg_object(bb_graphics_context).f_matDirty=1;
	pop_err();
	return 0;
}
function bb_graphics_SetMatrix2(t_m){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<363>";
	bb_graphics_SetMatrix(dbg_array(t_m,0)[dbg_index],dbg_array(t_m,1)[dbg_index],dbg_array(t_m,2)[dbg_index],dbg_array(t_m,3)[dbg_index],dbg_array(t_m,4)[dbg_index],dbg_array(t_m,5)[dbg_index]);
	pop_err();
	return 0;
}
function bb_graphics_SetColor(t_r,t_g,t_b){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<322>";
	dbg_object(bb_graphics_context).f_color_r=t_r;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<323>";
	dbg_object(bb_graphics_context).f_color_g=t_g;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<324>";
	dbg_object(bb_graphics_context).f_color_b=t_b;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<325>";
	dbg_object(bb_graphics_context).f_device.SetColor(t_r,t_g,t_b);
	pop_err();
	return 0;
}
function bb_graphics_SetAlpha(t_alpha){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<333>";
	dbg_object(bb_graphics_context).f_alpha=t_alpha;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<334>";
	dbg_object(bb_graphics_context).f_device.SetAlpha(t_alpha);
	pop_err();
	return 0;
}
function bb_graphics_SetBlend(t_blend){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<342>";
	dbg_object(bb_graphics_context).f_blend=t_blend;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<343>";
	dbg_object(bb_graphics_context).f_device.SetBlend(t_blend);
	pop_err();
	return 0;
}
function bb_graphics_DeviceWidth(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<301>";
	var t_=dbg_object(bb_graphics_context).f_device.Width();
	pop_err();
	return t_;
}
function bb_graphics_DeviceHeight(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<305>";
	var t_=dbg_object(bb_graphics_context).f_device.Height();
	pop_err();
	return t_;
}
function bb_graphics_SetScissor(t_x,t_y,t_width,t_height){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<351>";
	dbg_object(bb_graphics_context).f_scissor_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<352>";
	dbg_object(bb_graphics_context).f_scissor_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<353>";
	dbg_object(bb_graphics_context).f_scissor_width=t_width;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<354>";
	dbg_object(bb_graphics_context).f_scissor_height=t_height;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<355>";
	dbg_object(bb_graphics_context).f_device.SetScissor(((t_x)|0),((t_y)|0),((t_width)|0),((t_height)|0));
	pop_err();
	return 0;
}
function bb_graphics_BeginRender(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<286>";
	if(!((dbg_object(bb_graphics_context).f_device.Mode())!=0)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<286>";
		pop_err();
		return 0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<287>";
	bb_graphics_renderDevice=dbg_object(bb_graphics_context).f_device;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<288>";
	dbg_object(bb_graphics_context).f_matrixSp=0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<289>";
	bb_graphics_SetMatrix(1.0,0.0,0.0,1.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<290>";
	bb_graphics_SetColor(255.0,255.0,255.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<291>";
	bb_graphics_SetAlpha(1.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<292>";
	bb_graphics_SetBlend(0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<293>";
	bb_graphics_SetScissor(0.0,0.0,(bb_graphics_DeviceWidth()),(bb_graphics_DeviceHeight()));
	pop_err();
	return 0;
}
function bb_graphics_EndRender(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<297>";
	bb_graphics_renderDevice=null;
	pop_err();
	return 0;
}
var bb_framework_DEVICE_WIDTH;
var bb_framework_DEVICE_HEIGHT;
var bb_framework_SCREEN_WIDTH;
var bb_framework_SCREEN_HEIGHT;
var bb_framework_SCREEN_WIDTH2;
var bb_framework_SCREEN_HEIGHT2;
var bb_framework_SCREENX_RATIO;
var bb_framework_SCREENY_RATIO;
function bb_input_MouseX(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<92>";
	var t_=bb_input_device.MouseX();
	pop_err();
	return t_;
}
function bb_input_MouseY(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<96>";
	var t_=bb_input_device.MouseY();
	pop_err();
	return t_;
}
var bb_random_Seed;
function bb_framework_DeltaTimer(){
	Object.call(this);
	this.f_targetfps=60.0;
	this.f_lastticks=.0;
	this.f_delta=.0;
	this.f_frametime=.0;
	this.f_currentticks=.0;
}
function bb_framework_DeltaTimer_new(t_fps){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<868>";
	this.f_targetfps=t_fps;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<869>";
	this.f_lastticks=(bb_app_Millisecs());
	pop_err();
	return this;
}
function bb_framework_DeltaTimer_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<860>";
	pop_err();
	return this;
}
bb_framework_DeltaTimer.prototype.m_UpdateDelta=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<873>";
	this.f_currentticks=(bb_app_Millisecs());
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<874>";
	this.f_frametime=this.f_currentticks-this.f_lastticks;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<875>";
	this.f_delta=this.f_frametime/(1000.0/this.f_targetfps);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<876>";
	this.f_lastticks=this.f_currentticks;
	pop_err();
}
function bb_app_Millisecs(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<149>";
	var t_=bb_app_device.MilliSecs();
	pop_err();
	return t_;
}
var bb_framework_dt;
function bb_app_SetUpdateRate(t_hertz){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<141>";
	var t_=bb_app_device.SetUpdateRate(t_hertz);
	pop_err();
	return t_;
}
function bb_framework_Sprite(){
	Object.call(this);
	this.f_image=null;
	this.f_x=.0;
	this.f_y=.0;
	this.f_alpha=1.0;
	this.f_hitBox=null;
	this.f_visible=true;
}
bb_framework_Sprite.prototype.m_SetHitBox=function(t_hitX,t_hitY,t_hitWidth,t_hitHeight){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1829>";
	this.f_hitBox=bb_framework_HitBox_new.call(new bb_framework_HitBox,(t_hitX),(t_hitY),(t_hitWidth),(t_hitHeight));
	pop_err();
}
function bb_framework_Sprite_new(t_img,t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1635>";
	dbg_object(this).f_image=t_img;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1636>";
	dbg_object(this).f_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1637>";
	dbg_object(this).f_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1638>";
	dbg_object(this).f_alpha=1.0;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1639>";
	this.m_SetHitBox(((-dbg_object(t_img).f_image.m_HandleX())|0),((-dbg_object(t_img).f_image.m_HandleY())|0),dbg_object(t_img).f_w,dbg_object(t_img).f_h);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1640>";
	dbg_object(this).f_visible=true;
	pop_err();
	return this;
}
function bb_framework_Sprite_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1595>";
	pop_err();
	return this;
}
function bb_framework_Particle(){
	bb_framework_Sprite.call(this);
}
bb_framework_Particle.prototype=extend_class(bb_framework_Sprite);
var bb_framework_Particle_MAX_PARTICLES;
function bb_framework_Particle_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1847>";
	bb_framework_Sprite_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1847>";
	pop_err();
	return this;
}
var bb_framework_Particle_particles;
function bb_framework_Particle_Cache(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1862>";
	for(var t_i=0;t_i<=bb_framework_Particle_MAX_PARTICLES-1;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1863>";
		dbg_array(bb_framework_Particle_particles,t_i)[dbg_index]=bb_framework_Particle_new.call(new bb_framework_Particle)
	}
	pop_err();
}
function bb_framework_HitBox(){
	Object.call(this);
	this.f_x=.0;
	this.f_y=.0;
	this.f_w=.0;
	this.f_h=.0;
}
function bb_framework_HitBox_new(t_x,t_y,t_w,t_h){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1839>";
	dbg_object(this).f_x=t_x;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1840>";
	dbg_object(this).f_y=t_y;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1841>";
	dbg_object(this).f_w=t_w;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1842>";
	dbg_object(this).f_h=t_h;
	pop_err();
	return this;
}
function bb_framework_HitBox_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1834>";
	pop_err();
	return this;
}
function bb_framework_FPSCounter(){
	Object.call(this);
}
var bb_framework_FPSCounter_startTime;
var bb_framework_FPSCounter_fpsCount;
var bb_framework_FPSCounter_totalFPS;
function bb_framework_FPSCounter_Update(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<845>";
	if(bb_app_Millisecs()-bb_framework_FPSCounter_startTime>=1000){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<846>";
		bb_framework_FPSCounter_totalFPS=bb_framework_FPSCounter_fpsCount;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<847>";
		bb_framework_FPSCounter_fpsCount=0;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<848>";
		bb_framework_FPSCounter_startTime=bb_app_Millisecs();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<850>";
		bb_framework_FPSCounter_fpsCount+=1;
	}
	pop_err();
}
function bb_framework_FPSCounter_Draw(t_x,t_y,t_ax,t_ay){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<855>";
	bb_graphics_DrawText("FPS: "+String(bb_framework_FPSCounter_totalFPS),(t_x),(t_y),t_ax,t_ay);
	pop_err();
}
function bb_graphics_PushMatrix(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<382>";
	var t_sp=dbg_object(bb_graphics_context).f_matrixSp;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<383>";
	dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+0)[dbg_index]=dbg_object(bb_graphics_context).f_ix
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<384>";
	dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+1)[dbg_index]=dbg_object(bb_graphics_context).f_iy
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<385>";
	dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+2)[dbg_index]=dbg_object(bb_graphics_context).f_jx
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<386>";
	dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+3)[dbg_index]=dbg_object(bb_graphics_context).f_jy
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<387>";
	dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+4)[dbg_index]=dbg_object(bb_graphics_context).f_tx
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<388>";
	dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+5)[dbg_index]=dbg_object(bb_graphics_context).f_ty
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<389>";
	dbg_object(bb_graphics_context).f_matrixSp=t_sp+6;
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
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<269>";
	if(!((bb_graphics_renderDevice)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<269>";
		error("Rendering operations can only be performed inside OnRender");
	}
	pop_err();
	return 0;
}
function bb_graphics_Cls(t_r,t_g,t_b){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<426>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<428>";
	bb_graphics_renderDevice.Cls(t_r,t_g,t_b);
	pop_err();
	return 0;
}
function bb_graphics_Transform(t_ix,t_iy,t_jx,t_jy,t_tx,t_ty){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<403>";
	var t_ix2=t_ix*dbg_object(bb_graphics_context).f_ix+t_iy*dbg_object(bb_graphics_context).f_jx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<404>";
	var t_iy2=t_ix*dbg_object(bb_graphics_context).f_iy+t_iy*dbg_object(bb_graphics_context).f_jy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<405>";
	var t_jx2=t_jx*dbg_object(bb_graphics_context).f_ix+t_jy*dbg_object(bb_graphics_context).f_jx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<406>";
	var t_jy2=t_jx*dbg_object(bb_graphics_context).f_iy+t_jy*dbg_object(bb_graphics_context).f_jy;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<407>";
	var t_tx2=t_tx*dbg_object(bb_graphics_context).f_ix+t_ty*dbg_object(bb_graphics_context).f_jx+dbg_object(bb_graphics_context).f_tx;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<408>";
	var t_ty2=t_tx*dbg_object(bb_graphics_context).f_iy+t_ty*dbg_object(bb_graphics_context).f_jy+dbg_object(bb_graphics_context).f_ty;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<409>";
	bb_graphics_SetMatrix(t_ix2,t_iy2,t_jx2,t_jy2,t_tx2,t_ty2);
	pop_err();
	return 0;
}
function bb_graphics_Transform2(t_m){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<399>";
	bb_graphics_Transform(dbg_array(t_m,0)[dbg_index],dbg_array(t_m,1)[dbg_index],dbg_array(t_m,2)[dbg_index],dbg_array(t_m,3)[dbg_index],dbg_array(t_m,4)[dbg_index],dbg_array(t_m,5)[dbg_index]);
	pop_err();
	return 0;
}
function bb_graphics_Scale(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<417>";
	bb_graphics_Transform(t_x,0.0,0.0,t_y,0.0,0.0);
	pop_err();
	return 0;
}
function bb_graphics_Translate(t_x,t_y){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<413>";
	bb_graphics_Transform(1.0,0.0,0.0,1.0,t_x,t_y);
	pop_err();
	return 0;
}
function bb_diddydata_DiddyDataLayer(){
	Object.call(this);
	this.f_index=0;
	this.f_objects=bb_diddydata_DiddyDataObjects_new.call(new bb_diddydata_DiddyDataObjects);
	this.implments={bb_comparator_IComparable:1};
}
bb_diddydata_DiddyDataLayer.prototype.m_Render2=function(t_xoffset,t_yoffset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
	var t_=this.f_objects.m_ObjectEnumerator();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
	while(t_.m_HasNext()){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>";
		var t_obj=t_.m_NextObject();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<237>";
		if(dbg_object(t_obj).f_visible){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<238>";
			t_obj.m_Render2(t_xoffset,t_yoffset);
		}
	}
	pop_err();
}
function bb_collections_ICollection(){
	Object.call(this);
}
bb_collections_ICollection.prototype.m_Enumerator=function(){
}
bb_collections_ICollection.prototype.m_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.m_Enumerator();
	pop_err();
	return t_;
}
bb_collections_ICollection.prototype.m_Size=function(){
}
function bb_collections_IList(){
	bb_collections_ICollection.call(this);
	this.f_modCount=0;
}
bb_collections_IList.prototype=extend_class(bb_collections_ICollection);
bb_collections_IList.prototype.m_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(bb_collections_ListEnumerator_new.call(new bb_collections_ListEnumerator,this));
	pop_err();
	return t_;
}
bb_collections_IList.prototype.m_Get2=function(t_index){
}
bb_collections_IList.prototype.m_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.m_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw bb_exception_IndexOutOfBoundsException_new.call(new bb_exception_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
function bb_collections_ArrayList(){
	bb_collections_IList.call(this);
	this.f_size=0;
	this.f_elements=[];
}
bb_collections_ArrayList.prototype=extend_class(bb_collections_IList);
bb_collections_ArrayList.prototype.m_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(bb_collections_ArrayListEnumerator_new.call(new bb_collections_ArrayListEnumerator,this));
	pop_err();
	return t_;
}
bb_collections_ArrayList.prototype.m_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.f_size;
}
bb_collections_ArrayList.prototype.m_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.f_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw bb_exception_IndexOutOfBoundsException_new.call(new bb_exception_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.f_size),null);
	}
	pop_err();
}
bb_collections_ArrayList.prototype.m_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.m_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.f_elements,t_index)[dbg_index]),bb_diddydata_DiddyDataLayer);
	pop_err();
	return t_;
}
function bb_diddydata_DiddyDataLayers(){
	bb_collections_ArrayList.call(this);
}
bb_diddydata_DiddyDataLayers.prototype=extend_class(bb_collections_ArrayList);
function bb_collections_IEnumerator(){
	Object.call(this);
}
bb_collections_IEnumerator.prototype.m_HasNext=function(){
}
bb_collections_IEnumerator.prototype.m_NextObject=function(){
}
function bb_collections_IEnumerator_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
function bb_diddydata_DiddyDataObject(){
	Object.call(this);
	this.f_visible=true;
	this.f_imageName="";
	this.f_alpha=1.0;
	this.f_image=null;
	this.f_red=255;
	this.f_green=255;
	this.f_blue=255;
	this.f_x=.0;
	this.f_y=.0;
	this.f_rotation=.0;
	this.f_scaleX=.0;
	this.f_scaleY=.0;
}
bb_diddydata_DiddyDataObject.prototype.m_Render2=function(t_xoffset,t_yoffset){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<309>";
	if(((this.f_imageName).length!=0) && this.f_visible && this.f_alpha>0.0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<310>";
		if(!((this.f_image)!=null)){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<310>";
			this.f_image=dbg_object(bb_framework_diddyGame).f_images.m_Find(this.f_imageName);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<311>";
		if((this.f_image)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<312>";
			bb_graphics_SetColor((this.f_red),(this.f_green),(this.f_blue));
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<313>";
			bb_graphics_SetAlpha(this.f_alpha);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<314>";
			this.f_image.m_Draw(this.f_x+t_xoffset,this.f_y+t_yoffset,this.f_rotation,this.f_scaleX,this.f_scaleY,0);
		}
	}
	pop_err();
}
function bb_collections_ICollection2(){
	Object.call(this);
}
function bb_collections_ICollection2_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>";
	pop_err();
	return this;
}
bb_collections_ICollection2.prototype.m_ToArray=function(){
}
bb_collections_ICollection2.prototype.m_Enumerator=function(){
}
bb_collections_ICollection2.prototype.m_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>";
	var t_=this.m_Enumerator();
	pop_err();
	return t_;
}
bb_collections_ICollection2.prototype.m_Size=function(){
}
function bb_collections_IList2(){
	bb_collections_ICollection2.call(this);
	this.f_modCount=0;
}
bb_collections_IList2.prototype=extend_class(bb_collections_ICollection2);
function bb_collections_IList2_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	bb_collections_ICollection2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>";
	pop_err();
	return this;
}
bb_collections_IList2.prototype.m_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>";
	var t_=(bb_collections_ListEnumerator2_new.call(new bb_collections_ListEnumerator2,this));
	pop_err();
	return t_;
}
bb_collections_IList2.prototype.m_Get2=function(t_index){
}
bb_collections_IList2.prototype.m_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>";
	var t_size=this.m_Size();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
	if(t_index<0 || t_index>=t_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>";
		throw bb_exception_IndexOutOfBoundsException_new.call(new bb_exception_IndexOutOfBoundsException,"IList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(t_size),null);
	}
	pop_err();
}
function bb_collections_ArrayList2(){
	bb_collections_IList2.call(this);
	this.f_elements=[];
	this.f_size=0;
}
bb_collections_ArrayList2.prototype=extend_class(bb_collections_IList2);
function bb_collections_ArrayList2_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>";
	bb_collections_IList2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>";
	dbg_object(this).f_elements=new_object_array(10);
	pop_err();
	return this;
}
function bb_collections_ArrayList2_new2(t_initialCapacity){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>";
	bb_collections_IList2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
	if(t_initialCapacity<0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>";
		throw bb_exception_IllegalArgumentException_new.call(new bb_exception_IllegalArgumentException,"ArrayList.New: Capacity must be >= 0",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>";
	dbg_object(this).f_elements=new_object_array(t_initialCapacity);
	pop_err();
	return this;
}
function bb_collections_ArrayList2_new3(t_c){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>";
	bb_collections_IList2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
	if(!((t_c)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>";
		throw bb_exception_IllegalArgumentException_new.call(new bb_exception_IllegalArgumentException,"ArrayList.New: Source collection must not be null",null);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>";
	this.f_elements=t_c.m_ToArray();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>";
	this.f_size=this.f_elements.length;
	pop_err();
	return this;
}
bb_collections_ArrayList2.prototype.m_Enumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>";
	var t_=(bb_collections_ArrayListEnumerator2_new.call(new bb_collections_ArrayListEnumerator2,this));
	pop_err();
	return t_;
}
bb_collections_ArrayList2.prototype.m_ToArray=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>";
	var t_arr=new_object_array(this.f_size);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>";
	for(var t_i=0;t_i<this.f_size;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>";
		dbg_array(t_arr,t_i)[dbg_index]=dbg_array(this.f_elements,t_i)[dbg_index]
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>";
	pop_err();
	return t_arr;
}
bb_collections_ArrayList2.prototype.m_Size=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>";
	pop_err();
	return this.f_size;
}
bb_collections_ArrayList2.prototype.m_RangeCheck=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
	if(t_index<0 || t_index>=this.f_size){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>";
		throw bb_exception_IndexOutOfBoundsException_new.call(new bb_exception_IndexOutOfBoundsException,"ArrayList.RangeCheck: Index out of bounds: "+String(t_index)+" is not 0<=index<"+String(this.f_size),null);
	}
	pop_err();
}
bb_collections_ArrayList2.prototype.m_Get2=function(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>";
	this.m_RangeCheck(t_index);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>";
	var t_=object_downcast((dbg_array(this.f_elements,t_index)[dbg_index]),bb_diddydata_DiddyDataObject);
	pop_err();
	return t_;
}
function bb_diddydata_DiddyDataObjects(){
	bb_collections_ArrayList2.call(this);
}
bb_diddydata_DiddyDataObjects.prototype=extend_class(bb_collections_ArrayList2);
function bb_diddydata_DiddyDataObjects_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<244>";
	bb_collections_ArrayList2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<244>";
	pop_err();
	return this;
}
function bb_collections_IEnumerator2(){
	Object.call(this);
}
bb_collections_IEnumerator2.prototype.m_HasNext=function(){
}
bb_collections_IEnumerator2.prototype.m_NextObject=function(){
}
function bb_collections_IEnumerator2_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>";
	pop_err();
	return this;
}
function bb_map_MapKeys(){
	Object.call(this);
	this.f_map=null;
}
function bb_map_MapKeys_new(t_map){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>";
	dbg_object(this).f_map=t_map;
	pop_err();
	return this;
}
function bb_map_MapKeys_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>";
	pop_err();
	return this;
}
bb_map_MapKeys.prototype.m_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>";
	var t_=bb_map_KeyEnumerator_new.call(new bb_map_KeyEnumerator,this.f_map.m_FirstNode());
	pop_err();
	return t_;
}
function bb_map_KeyEnumerator(){
	Object.call(this);
	this.f_node=null;
}
function bb_map_KeyEnumerator_new(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>";
	dbg_object(this).f_node=t_node;
	pop_err();
	return this;
}
function bb_map_KeyEnumerator_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>";
	pop_err();
	return this;
}
bb_map_KeyEnumerator.prototype.m_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>";
	var t_=this.f_node!=null;
	pop_err();
	return t_;
}
bb_map_KeyEnumerator.prototype.m_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>";
	var t_t=this.f_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>";
	this.f_node=this.f_node.m_NextNode();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>";
	pop_err();
	return dbg_object(t_t).f_key;
}
function bb_map_Node2(){
	Object.call(this);
	this.f_left=null;
	this.f_right=null;
	this.f_parent=null;
	this.f_key="";
	this.f_value=null;
}
bb_map_Node2.prototype.m_NextNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>";
	var t_node=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>";
	if((this.f_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>";
		t_node=this.f_right;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>";
		while((dbg_object(t_node).f_left)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>";
			t_node=dbg_object(t_node).f_left;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>";
		pop_err();
		return t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>";
	t_node=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>";
	var t_parent=dbg_object(this).f_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>";
	while(((t_parent)!=null) && t_node==dbg_object(t_parent).f_right){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>";
		t_node=t_parent;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>";
		t_parent=dbg_object(t_parent).f_parent;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>";
	pop_err();
	return t_parent;
}
function bb_assert_AssertError(t_msg){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<138>";
	throw bb_exception_AssertException_new.call(new bb_exception_AssertException,t_msg,null);
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
function bb_graphics_ValidateMatrix(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<262>";
	if((dbg_object(bb_graphics_context).f_matDirty)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<263>";
		dbg_object(bb_graphics_context).f_device.SetMatrix(dbg_object(bb_graphics_context).f_ix,dbg_object(bb_graphics_context).f_iy,dbg_object(bb_graphics_context).f_jx,dbg_object(bb_graphics_context).f_jy,dbg_object(bb_graphics_context).f_tx,dbg_object(bb_graphics_context).f_ty);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<264>";
		dbg_object(bb_graphics_context).f_matDirty=0;
	}
	pop_err();
	return 0;
}
function bb_graphics_PopMatrix(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<393>";
	var t_sp=dbg_object(bb_graphics_context).f_matrixSp-6;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<394>";
	bb_graphics_SetMatrix(dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+0)[dbg_index],dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+1)[dbg_index],dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+2)[dbg_index],dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+3)[dbg_index],dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+4)[dbg_index],dbg_array(dbg_object(bb_graphics_context).f_matrixStack,t_sp+5)[dbg_index]);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<395>";
	dbg_object(bb_graphics_context).f_matrixSp=t_sp;
	pop_err();
	return 0;
}
function bb_graphics_DrawImage(t_image,t_x,t_y,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<489>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<491>";
	var t_f=dbg_array(dbg_object(t_image).f_frames,t_frame)[dbg_index];
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<493>";
	if((dbg_object(bb_graphics_context).f_tformed)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<494>";
		bb_graphics_PushMatrix();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<496>";
		bb_graphics_Translate(t_x-dbg_object(t_image).f_tx,t_y-dbg_object(t_image).f_ty);
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<498>";
		bb_graphics_ValidateMatrix();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<500>";
		if((dbg_object(t_image).f_flags&65536)!=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<501>";
			dbg_object(bb_graphics_context).f_device.DrawSurface(dbg_object(t_image).f_surface,0.0,0.0);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<503>";
			dbg_object(bb_graphics_context).f_device.DrawSurface2(dbg_object(t_image).f_surface,0.0,0.0,dbg_object(t_f).f_x,dbg_object(t_f).f_y,dbg_object(t_image).f_width,dbg_object(t_image).f_height);
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<506>";
		bb_graphics_PopMatrix();
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<508>";
		bb_graphics_ValidateMatrix();
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<510>";
		if((dbg_object(t_image).f_flags&65536)!=0){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<511>";
			dbg_object(bb_graphics_context).f_device.DrawSurface(dbg_object(t_image).f_surface,t_x-dbg_object(t_image).f_tx,t_y-dbg_object(t_image).f_ty);
		}else{
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<513>";
			dbg_object(bb_graphics_context).f_device.DrawSurface2(dbg_object(t_image).f_surface,t_x-dbg_object(t_image).f_tx,t_y-dbg_object(t_image).f_ty,dbg_object(t_f).f_x,dbg_object(t_f).f_y,dbg_object(t_image).f_width,dbg_object(t_image).f_height);
		}
	}
	pop_err();
	return 0;
}
function bb_graphics_Rotate(t_angle){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<421>";
	bb_graphics_Transform(Math.cos((t_angle)*D2R),-Math.sin((t_angle)*D2R),Math.sin((t_angle)*D2R),Math.cos((t_angle)*D2R),0.0,0.0);
	pop_err();
	return 0;
}
function bb_graphics_DrawImage2(t_image,t_x,t_y,t_rotation,t_scaleX,t_scaleY,t_frame){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<520>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<522>";
	var t_f=dbg_array(dbg_object(t_image).f_frames,t_frame)[dbg_index];
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<524>";
	bb_graphics_PushMatrix();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<526>";
	bb_graphics_Translate(t_x,t_y);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<527>";
	bb_graphics_Rotate(t_rotation);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<528>";
	bb_graphics_Scale(t_scaleX,t_scaleY);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<530>";
	bb_graphics_Translate(-dbg_object(t_image).f_tx,-dbg_object(t_image).f_ty);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<532>";
	bb_graphics_ValidateMatrix();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<534>";
	if((dbg_object(t_image).f_flags&65536)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<535>";
		dbg_object(bb_graphics_context).f_device.DrawSurface(dbg_object(t_image).f_surface,0.0,0.0);
	}else{
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<537>";
		dbg_object(bb_graphics_context).f_device.DrawSurface2(dbg_object(t_image).f_surface,0.0,0.0,dbg_object(t_f).f_x,dbg_object(t_f).f_y,dbg_object(t_image).f_width,dbg_object(t_image).f_height);
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<540>";
	bb_graphics_PopMatrix();
	pop_err();
	return 0;
}
function bb_graphics_DrawRect(t_x,t_y,t_w,t_h){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<441>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<443>";
	bb_graphics_ValidateMatrix();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<444>";
	bb_graphics_renderDevice.DrawRect(t_x,t_y,t_w,t_h);
	pop_err();
	return 0;
}
function bb_graphics_DrawText(t_text,t_x,t_y,t_xalign,t_yalign){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<625>";
	bb_graphics_DebugRenderDevice();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<627>";
	if(!((dbg_object(bb_graphics_context).f_font)!=null)){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<627>";
		pop_err();
		return 0;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<629>";
	var t_w=dbg_object(bb_graphics_context).f_font.m_Width();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<630>";
	var t_h=dbg_object(bb_graphics_context).f_font.m_Height();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<632>";
	t_x-=Math.floor((t_w*t_text.length)*t_xalign);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<633>";
	t_y-=Math.floor((t_h)*t_yalign);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<635>";
	for(var t_i=0;t_i<t_text.length;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<636>";
		var t_ch=t_text.charCodeAt(t_i)-dbg_object(bb_graphics_context).f_firstChar;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<637>";
		if(t_ch>=0 && t_ch<dbg_object(bb_graphics_context).f_font.m_Frames()){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<638>";
			bb_graphics_DrawImage(dbg_object(bb_graphics_context).f_font,t_x+(t_i*t_w),t_y,t_ch);
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
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<178>";
	var t_rep="";
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<179>";
	for(var t_i=1;t_i<=t_n;t_i=t_i+1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<180>";
		t_rep=t_rep+t_char;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<182>";
	t_str=t_rep+t_str;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<183>";
	var t_=t_str.slice(t_str.length-t_n);
	pop_err();
	return t_;
}
function bb_functions_FormatNumber(t_number,t_decimal,t_comma,t_padleft){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<243>";
	bb_assert_Assert(t_decimal>-1 && t_comma>-1 && t_padleft>-1,"Negative numbers not allowed in FormatNumber()");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<245>";
	var t_str=String(t_number);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<246>";
	var t_dl=t_str.indexOf(".",0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<247>";
	if(t_decimal==0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<247>";
		t_decimal=-1;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<248>";
	t_str=t_str.slice(0,t_dl+t_decimal+1);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<250>";
	if((t_comma)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<251>";
		while(t_dl>t_comma){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<252>";
			t_str=t_str.slice(0,t_dl-t_comma)+","+t_str.slice(t_dl-t_comma);
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<253>";
			t_dl-=t_comma;
		}
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<257>";
	if((t_padleft)!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<258>";
		var t_paddedLength=t_padleft+t_decimal+1;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<259>";
		if(t_paddedLength<t_str.length){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<259>";
			t_str="Error";
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<260>";
		t_str=bb_functions_RSet(t_str,t_paddedLength," ");
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<262>";
	pop_err();
	return t_str;
}
function bb_audio_MusicState(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<117>";
	var t_=bb_audio_device.MusicState();
	pop_err();
	return t_;
}
function bb_framework_SoundPlayer(){
	Object.call(this);
}
var bb_framework_SoundPlayer_channel;
function bb_input_MouseHit(t_button){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<104>";
	var t_=bb_input_device.KeyHit(1+t_button);
	pop_err();
	return t_;
}
function bb_input_TouchHit(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<121>";
	var t_=bb_input_device.KeyHit(384+t_index);
	pop_err();
	return t_;
}
function bb_input_TouchDown(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<117>";
	var t_=bb_input_device.KeyDown(384+t_index);
	pop_err();
	return t_;
}
function bb_input_TouchX(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<109>";
	var t_=bb_input_device.TouchX(t_index);
	pop_err();
	return t_;
}
function bb_input_TouchY(t_index){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<113>";
	var t_=bb_input_device.TouchY(t_index);
	pop_err();
	return t_;
}
function bb_input_MouseDown(t_button){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<100>";
	var t_=bb_input_device.KeyDown(1+t_button);
	pop_err();
	return t_;
}
function bb_input_KeyHit(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<77>";
	var t_=bb_input_device.KeyHit(t_key);
	pop_err();
	return t_;
}
function bb_input_KeyDown(t_key){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<73>";
	var t_=bb_input_device.KeyDown(t_key);
	pop_err();
	return t_;
}
function bb_audio_SetMusicVolume(t_volume){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<121>";
	bb_audio_device.SetMusicVolume(t_volume);
	pop_err();
	return 0;
}
function bb_audio_SetChannelVolume(t_channel,t_volume){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<89>";
	bb_audio_device.SetVolume(t_channel,t_volume);
	pop_err();
	return 0;
}
function bb_functions_StripExt(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<202>";
	var t_i=t_path.lastIndexOf(".");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<203>";
	if(t_i!=-1 && t_path.indexOf("/",t_i+1)==-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<203>";
		var t_=t_path.slice(0,t_i);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<204>";
	pop_err();
	return t_path;
}
function bb_functions_StripDir(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<196>";
	var t_i=t_path.lastIndexOf("/");
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<197>";
	if(t_i!=-1){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<197>";
		var t_=t_path.slice(t_i+1);
		pop_err();
		return t_;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<198>";
	pop_err();
	return t_path;
}
function bb_functions_StripAll(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<208>";
	var t_=bb_functions_StripDir(bb_functions_StripExt(t_path));
	pop_err();
	return t_;
}
function bb_functions_LoadAnimBitmap(t_path,t_w,t_h,t_count,t_tmpImage){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<123>";
	t_tmpImage=bb_graphics_LoadImage(t_path,1,bb_graphics_Image_DefaultFlags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<125>";
	bb_assert_AssertNotNull((t_tmpImage),"Error loading bitmap "+t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<127>";
	var t_pointer=t_tmpImage.m_GrabImage(0,0,t_w,t_h,t_count,1);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<129>";
	pop_err();
	return t_pointer;
}
function bb_functions_LoadBitmap(t_path,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<114>";
	var t_pointer=bb_graphics_LoadImage(t_path,1,t_flags);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<116>";
	bb_assert_AssertNotNull((t_pointer),"Error loading bitmap "+t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<118>";
	pop_err();
	return t_pointer;
}
function bb_map_MapKeys2(){
	Object.call(this);
	this.f_map=null;
}
function bb_map_MapKeys2_new(t_map){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>";
	dbg_object(this).f_map=t_map;
	pop_err();
	return this;
}
function bb_map_MapKeys2_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>";
	pop_err();
	return this;
}
bb_map_MapKeys2.prototype.m_ObjectEnumerator=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>";
	var t_=bb_map_KeyEnumerator2_new.call(new bb_map_KeyEnumerator2,this.f_map.m_FirstNode());
	pop_err();
	return t_;
}
function bb_map_KeyEnumerator2(){
	Object.call(this);
	this.f_node=null;
}
function bb_map_KeyEnumerator2_new(t_node){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>";
	dbg_object(this).f_node=t_node;
	pop_err();
	return this;
}
function bb_map_KeyEnumerator2_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>";
	pop_err();
	return this;
}
bb_map_KeyEnumerator2.prototype.m_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>";
	var t_=this.f_node!=null;
	pop_err();
	return t_;
}
bb_map_KeyEnumerator2.prototype.m_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>";
	var t_t=this.f_node;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>";
	this.f_node=this.f_node.m_NextNode();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>";
	pop_err();
	return dbg_object(t_t).f_key;
}
function bb_map_Node3(){
	Object.call(this);
	this.f_left=null;
	this.f_right=null;
	this.f_parent=null;
	this.f_key="";
	this.f_value=null;
}
bb_map_Node3.prototype.m_NextNode=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>";
	var t_node=null;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>";
	if((this.f_right)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>";
		t_node=this.f_right;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>";
		while((dbg_object(t_node).f_left)!=null){
			err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>";
			t_node=dbg_object(t_node).f_left;
		}
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>";
		pop_err();
		return t_node;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>";
	t_node=this;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>";
	var t_parent=dbg_object(this).f_parent;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>";
	while(((t_parent)!=null) && t_node==dbg_object(t_parent).f_right){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>";
		t_node=t_parent;
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>";
		t_parent=dbg_object(t_parent).f_parent;
	}
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>";
	pop_err();
	return t_parent;
}
function bb_audio_Sound(){
	Object.call(this);
	this.f_sample=null;
}
function bb_audio_Sound_new(t_sample){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<45>";
	dbg_object(this).f_sample=t_sample;
	pop_err();
	return this;
}
function bb_audio_Sound_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<42>";
	pop_err();
	return this;
}
function bb_audio_LoadSound(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<64>";
	var t_sample=bb_audio_device.LoadSample(t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<65>";
	if((t_sample)!=null){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<65>";
		var t_=bb_audio_Sound_new.call(new bb_audio_Sound,t_sample);
		pop_err();
		return t_;
	}
	pop_err();
	return null;
}
function bb_functions_LoadSoundSample(t_path){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<133>";
	var t_pointer=bb_audio_LoadSound(t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<134>";
	bb_assert_AssertNotNull((t_pointer),"Error loading sound "+t_path);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<135>";
	pop_err();
	return t_pointer;
}
function bb_audio_PlayMusic(t_path,t_flags){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<101>";
	var t_=bb_audio_device.PlayMusic(t_path,t_flags);
	pop_err();
	return t_;
}
function bb_mainClass_TitleScreen(){
	bb_framework_Screen.call(this);
}
bb_mainClass_TitleScreen.prototype=extend_class(bb_framework_Screen);
function bb_mainClass_TitleScreen_new(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<23>";
	bb_framework_Screen_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<24>";
	this.f_name="Title";
	pop_err();
	return this;
}
bb_mainClass_TitleScreen.prototype.m_Start=function(){
	push_err();
	pop_err();
}
bb_mainClass_TitleScreen.prototype.m_Render=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<32>";
	bb_graphics_Cls(0.0,0.0,0.0);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<33>";
	bb_graphics_DrawText("TITLE SCREEN!",bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2,0.5,0.5);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<34>";
	bb_graphics_DrawText("Escape to Quit!",bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2+40.0,0.5,0.5);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<35>";
	bb_framework_FPSCounter_Draw(0,0,0.0,0.0);
	pop_err();
}
bb_mainClass_TitleScreen.prototype.m_Update2=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<39>";
	if((bb_input_KeyHit(27))!=0){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<40>";
		this.m_FadeToScreen(null,bb_framework_defaultFadeTime,false,false,true);
	}
	pop_err();
}
var bb_mainClass_titleScreen;
function bb_functions_ExitApp(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<95>";
	error("");
	pop_err();
}
function bb_collections_ListEnumerator(){
	bb_collections_IEnumerator.call(this);
	this.f_lst=null;
	this.f_expectedModCount=0;
	this.f_index=0;
	this.f_lastIndex=0;
}
bb_collections_ListEnumerator.prototype=extend_class(bb_collections_IEnumerator);
function bb_collections_ListEnumerator_new(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	bb_collections_IEnumerator_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).f_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.f_expectedModCount=dbg_object(t_lst).f_modCount;
	pop_err();
	return this;
}
function bb_collections_ListEnumerator_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	bb_collections_IEnumerator_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
bb_collections_ListEnumerator.prototype.m_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.f_lst).f_modCount!=this.f_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw bb_exception_ConcurrentModificationException_new.call(new bb_exception_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
bb_collections_ListEnumerator.prototype.m_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.f_index<this.f_lst.m_Size();
	pop_err();
	return t_;
}
bb_collections_ListEnumerator.prototype.m_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.f_lastIndex=this.f_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.f_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.f_lst.m_Get2(this.f_lastIndex);
	pop_err();
	return t_;
}
function bb_collections_ArrayListEnumerator(){
	bb_collections_ListEnumerator.call(this);
	this.f_alst=null;
}
bb_collections_ArrayListEnumerator.prototype=extend_class(bb_collections_ListEnumerator);
function bb_collections_ArrayListEnumerator_new(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	bb_collections_ListEnumerator_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).f_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.f_expectedModCount=dbg_object(this.f_alst).f_modCount;
	pop_err();
	return this;
}
function bb_collections_ArrayListEnumerator_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	bb_collections_ListEnumerator_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
bb_collections_ArrayListEnumerator.prototype.m_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.f_index<dbg_object(this.f_alst).f_size;
	pop_err();
	return t_;
}
bb_collections_ArrayListEnumerator.prototype.m_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.f_lastIndex=this.f_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.f_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.f_alst).f_elements,this.f_lastIndex)[dbg_index]),bb_diddydata_DiddyDataLayer);
	pop_err();
	return t_;
}
function bb_collections_ListEnumerator2(){
	bb_collections_IEnumerator2.call(this);
	this.f_lst=null;
	this.f_expectedModCount=0;
	this.f_index=0;
	this.f_lastIndex=0;
}
bb_collections_ListEnumerator2.prototype=extend_class(bb_collections_IEnumerator2);
function bb_collections_ListEnumerator2_new(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>";
	bb_collections_IEnumerator2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>";
	dbg_object(this).f_lst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>";
	this.f_expectedModCount=dbg_object(t_lst).f_modCount;
	pop_err();
	return this;
}
function bb_collections_ListEnumerator2_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	bb_collections_IEnumerator2_new.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>";
	pop_err();
	return this;
}
bb_collections_ListEnumerator2.prototype.m_CheckConcurrency=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
	if(dbg_object(this.f_lst).f_modCount!=this.f_expectedModCount){
		err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>";
		throw bb_exception_ConcurrentModificationException_new.call(new bb_exception_ConcurrentModificationException,"ListEnumerator.CheckConcurrency: Concurrent list modification",null);
	}
	pop_err();
}
bb_collections_ListEnumerator2.prototype.m_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>";
	var t_=this.f_index<this.f_lst.m_Size();
	pop_err();
	return t_;
}
bb_collections_ListEnumerator2.prototype.m_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>";
	this.f_lastIndex=this.f_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>";
	this.f_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>";
	var t_=this.f_lst.m_Get2(this.f_lastIndex);
	pop_err();
	return t_;
}
function bb_collections_ArrayListEnumerator2(){
	bb_collections_ListEnumerator2.call(this);
	this.f_alst=null;
}
bb_collections_ArrayListEnumerator2.prototype=extend_class(bb_collections_ListEnumerator2);
function bb_collections_ArrayListEnumerator2_new(t_lst){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>";
	bb_collections_ListEnumerator2_new.call(this,(t_lst));
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>";
	dbg_object(this).f_alst=t_lst;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>";
	this.f_expectedModCount=dbg_object(this.f_alst).f_modCount;
	pop_err();
	return this;
}
function bb_collections_ArrayListEnumerator2_new2(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	bb_collections_ListEnumerator2_new2.call(this);
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>";
	pop_err();
	return this;
}
bb_collections_ArrayListEnumerator2.prototype.m_HasNext=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>";
	var t_=this.f_index<dbg_object(this.f_alst).f_size;
	pop_err();
	return t_;
}
bb_collections_ArrayListEnumerator2.prototype.m_NextObject=function(){
	push_err();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>";
	this.m_CheckConcurrency();
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>";
	this.f_lastIndex=this.f_index;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>";
	this.f_index+=1;
	err_info="C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>";
	var t_=object_downcast((dbg_array(dbg_object(this.f_alst).f_elements,this.f_lastIndex)[dbg_index]),bb_diddydata_DiddyDataObject);
	pop_err();
	return t_;
}
var bb_framework_defaultFadeTime;
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
	bb_graphics_context=null;
	bb_input_device=null;
	bb_audio_device=null;
	bb_app_device=null;
	bb_framework_diddyGame=null;
	bb_reflection__unknownClass=(bb_reflection_UnknownClass_new.call(new bb_reflection_UnknownClass));
	bb_graphics_Image_DefaultFlags=0;
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
	bb_framework_Particle_MAX_PARTICLES=800;
	bb_framework_Particle_particles=new_object_array(bb_framework_Particle_MAX_PARTICLES);
	bb_framework_FPSCounter_startTime=0;
	bb_framework_FPSCounter_fpsCount=0;
	bb_framework_FPSCounter_totalFPS=0;
	bb_framework_SoundPlayer_channel=0;
	bb_framework_SoundBank_path="sounds/";
	bb_mainClass_titleScreen=null;
	bb_framework_defaultFadeTime=600.0;
}
//${TRANSCODE_END}
