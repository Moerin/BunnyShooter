
#include "main.h"

//${CONFIG_BEGIN}
#define CFG_BINARY_FILES *.bin|*.dat
#define CFG_BRL_GAMETARGET_IMPLEMENTED 1
#define CFG_BRL_THREAD_IMPLEMENTED 1
#define CFG_CONFIG debug
#define CFG_CPP_GC_MODE 1
#define CFG_GLFW_SWAP_INTERVAL -1
#define CFG_GLFW_USE_MINGW 1
#define CFG_GLFW_WINDOW_FULLSCREEN 0
#define CFG_GLFW_WINDOW_HEIGHT 480
#define CFG_GLFW_WINDOW_RESIZABLE 0
#define CFG_GLFW_WINDOW_TITLE Monkey Game
#define CFG_GLFW_WINDOW_WIDTH 640
#define CFG_HOST winnt
#define CFG_IMAGE_FILES *.png|*.jpg
#define CFG_LANG cpp
#define CFG_MOJO_AUTO_SUSPEND_ENABLED 1
#define CFG_MOJO_DRIVER_IMPLEMENTED 1
#define CFG_MOJO_IMAGE_FILTERING_ENABLED 1
#define CFG_MUSIC_FILES *.wav|*.ogg
#define CFG_OPENGL_DEPTH_BUFFER_ENABLED 0
#define CFG_OPENGL_GLES20_ENABLED 0
#define CFG_REFLECTION_FILTER diddy.exception
#define CFG_SAFEMODE 0
#define CFG_SOUND_FILES *.wav|*.ogg
#define CFG_TARGET glfw
#define CFG_TEXT_FILES *.txt|*.xml|*.json|*.tmx
//${CONFIG_END}

//${TRANSCODE_BEGIN}

// C++ Monkey runtime.
//
// Placed into the public domain 24/02/2011.
// No warranty implied; use at your own risk.

//***** Monkey Types *****

typedef wchar_t Char;
template<class T> class Array;
class String;
class Object;

#if CFG_CPP_DOUBLE_PRECISION_FLOATS
typedef double Float;
#define FLOAT(X) X
#else
typedef float Float;
#define FLOAT(X) X##f
#endif

void dbg_error( const char *p );

#if !_MSC_VER
#define sprintf_s sprintf
#define sscanf_s sscanf
#endif

//***** GC Config *****

#define DEBUG_GC 0

// GC mode:
//
// 0 = disabled
// 1 = Incremental GC every OnWhatever
// 2 = Incremental GC every allocation
//
#ifndef CFG_CPP_GC_MODE
#define CFG_CPP_GC_MODE 1
#endif

//How many bytes alloced to trigger GC
//
#ifndef CFG_CPP_GC_TRIGGER
#define CFG_CPP_GC_TRIGGER 8*1024*1024
#endif

//GC_MODE 2 needs to track locals on a stack - this may need to be bumped if your app uses a LOT of locals, eg: is heavily recursive...
//
#ifndef CFG_CPP_GC_MAX_LOCALS
#define CFG_CPP_GC_MAX_LOCALS 8192
#endif

// ***** GC *****

#if _WIN32

int gc_micros(){
	static int f;
	static LARGE_INTEGER pcf;
	if( !f ){
		if( QueryPerformanceFrequency( &pcf ) && pcf.QuadPart>=1000000L ){
			pcf.QuadPart/=1000000L;
			f=1;
		}else{
			f=-1;
		}
	}
	if( f>0 ){
		LARGE_INTEGER pc;
		if( QueryPerformanceCounter( &pc ) ) return pc.QuadPart/pcf.QuadPart;
		f=-1;
	}
	return 0;// timeGetTime()*1000;
}

#elif __APPLE__

#include <mach/mach_time.h>

int gc_micros(){
	static int f;
	static mach_timebase_info_data_t timeInfo;
	if( !f ){
		mach_timebase_info( &timeInfo );
		timeInfo.denom*=1000L;
		f=1;
	}
	return mach_absolute_time()*timeInfo.numer/timeInfo.denom;
}

#else

int gc_micros(){
	return 0;
}

#endif

#define gc_mark_roots gc_mark

void gc_mark_roots();

struct gc_object;

gc_object *gc_object_alloc( int size );
void gc_object_free( gc_object *p );

struct gc_object{
	gc_object *succ;
	gc_object *pred;
	int flags;
	
	virtual ~gc_object(){
	}
	
	virtual void mark(){
	}
	
	void *operator new( size_t size ){
		return gc_object_alloc( size );
	}
	
	void operator delete( void *p ){
		gc_object_free( (gc_object*)p );
	}
};

gc_object gc_free_list;
gc_object gc_marked_list;
gc_object gc_unmarked_list;
gc_object gc_queued_list;	//doesn't really need to be doubly linked...

int gc_free_bytes;
int gc_marked_bytes;
int gc_alloced_bytes;
int gc_max_alloced_bytes;
int gc_new_bytes;
int gc_markbit=1;

gc_object *gc_cache[8];

int gc_ctor_nest;
gc_object *gc_locals[CFG_CPP_GC_MAX_LOCALS],**gc_locals_sp=gc_locals;

void gc_collect_all();
void gc_mark_queued( int n );

#define GC_CLEAR_LIST( LIST ) ((LIST).succ=(LIST).pred=&(LIST))

#define GC_LIST_IS_EMPTY( LIST ) ((LIST).succ==&(LIST))

#define GC_REMOVE_NODE( NODE ){\
(NODE)->pred->succ=(NODE)->succ;\
(NODE)->succ->pred=(NODE)->pred;}

#define GC_INSERT_NODE( NODE,SUCC ){\
(NODE)->pred=(SUCC)->pred;\
(NODE)->succ=(SUCC);\
(SUCC)->pred->succ=(NODE);\
(SUCC)->pred=(NODE);}

void gc_init1(){
	GC_CLEAR_LIST( gc_free_list );
	GC_CLEAR_LIST( gc_marked_list );
	GC_CLEAR_LIST( gc_unmarked_list);
	GC_CLEAR_LIST( gc_queued_list );
}

void gc_init2(){
	gc_mark_roots();
}

#if CFG_CPP_GC_MODE==2

struct gc_ctor{
	gc_ctor(){ ++gc_ctor_nest; }
	~gc_ctor(){ --gc_ctor_nest; }
};

struct gc_enter{
	gc_object **sp;
	gc_enter():sp(gc_locals_sp){
	}
	~gc_enter(){
	/*
		static int max_locals;
		int n=gc_locals_sp-gc_locals;
		if( n>max_locals ){
			max_locals=n;
			printf( "max_locals=%i\n",n );
		}
	*/
		gc_locals_sp=sp;
	}
};

#define GC_CTOR gc_ctor _c;
#define GC_ENTER gc_enter _e;

#else

struct gc_ctor{
};
struct gc_enter{
};

#define GC_CTOR
#define GC_ENTER

#endif

void gc_flush_free( int size ){

	int t=gc_free_bytes-size;
	if( t<0 ) t=0;
	
	while( gc_free_bytes>t ){
		gc_object *p=gc_free_list.succ;
		if( !p || p==&gc_free_list ){
//			printf("ERROR:p=%p gc_free_bytes=%i\n",p,gc_free_bytes);
//			fflush(stdout);
			gc_free_bytes=0;
			break;
		}
		GC_REMOVE_NODE(p);
		delete p;	//...to gc_free
	}
}

void *gc_ext_malloc( int size ){

	gc_new_bytes+=size;
	
	gc_flush_free( size );
	
	return malloc( size );
}

void gc_ext_malloced( int size ){

	gc_new_bytes+=size;
	
	gc_flush_free( size );
}

gc_object *gc_object_alloc( int size ){

	size=(size+7)&~7;
	
#if CFG_CPP_GC_MODE==1

	gc_new_bytes+=size;
	
#elif CFG_CPP_GC_MODE==2

	if( !gc_ctor_nest ){
#if DEBUG_GC
		int ms=gc_micros();
#endif
		if( gc_new_bytes+size>(CFG_CPP_GC_TRIGGER) ){
			gc_collect_all();
			gc_new_bytes=size;
		}else{
			gc_new_bytes+=size;
			gc_mark_queued( (long long)(gc_new_bytes)*(gc_alloced_bytes-gc_new_bytes)/(CFG_CPP_GC_TRIGGER)+gc_new_bytes );
		}
		
#if DEBUG_GC
		ms=gc_micros()-ms;
		if( ms>=100 ) {printf( "gc time:%i\n",ms );fflush( stdout );}
#endif
	}

#endif

	gc_flush_free( size );

	gc_object *p;
	if( size<64 && (p=gc_cache[size>>3]) ){
		gc_cache[size>>3]=p->succ;
	}else{
		p=(gc_object*)malloc( size );
	}
	
	p->flags=size|gc_markbit;
	GC_INSERT_NODE( p,&gc_unmarked_list );

	gc_alloced_bytes+=size;
	if( gc_alloced_bytes>gc_max_alloced_bytes ) gc_max_alloced_bytes=gc_alloced_bytes;
	
#if CFG_CPP_GC_MODE==2
	*gc_locals_sp++=p;
#endif

	return p;
}

void gc_object_free( gc_object *p ){

	int size=p->flags & ~7;
	gc_free_bytes-=size;
	
	if( size<64 ){
		p->succ=gc_cache[size>>3];
		gc_cache[size>>3]=p;
	}else{
		free( p );
	}
}

template<class T> void gc_mark( T *t ){

	gc_object *p=dynamic_cast<gc_object*>(t);
	
	if( p && (p->flags & 3)==gc_markbit ){
		p->flags^=1;
		GC_REMOVE_NODE( p );
		GC_INSERT_NODE( p,&gc_marked_list );
		gc_marked_bytes+=(p->flags & ~7);
		p->mark();
	}
}

template<class T> void gc_mark_q( T *t ){

	gc_object *p=dynamic_cast<gc_object*>(t);
	
	if( p && (p->flags & 3)==gc_markbit ){
		p->flags^=1;
		GC_REMOVE_NODE( p );
		GC_INSERT_NODE( p,&gc_queued_list );
	}
}

template<class T> T *gc_retain( T *t ){
#if CFG_CPP_GC_MODE==2
	*gc_locals_sp++=dynamic_cast<gc_object*>( t );
#endif	
	return t;
}

template<class T,class V> void gc_assign( T *&lhs,V *rhs ){
	gc_object *p=dynamic_cast<gc_object*>(rhs);
	if( p && (p->flags & 3)==gc_markbit ){
		p->flags^=1;
		GC_REMOVE_NODE( p );
		GC_INSERT_NODE( p,&gc_queued_list );
	}
	lhs=rhs;
}

void gc_mark_locals(){
	for( gc_object **pp=gc_locals;pp!=gc_locals_sp;++pp ){
		gc_object *p=*pp;
		if( p && (p->flags & 3)==gc_markbit ){
			p->flags^=1;
			GC_REMOVE_NODE( p );
			GC_INSERT_NODE( p,&gc_marked_list );
			gc_marked_bytes+=(p->flags & ~7);
			p->mark();
		}
	}
}

void gc_mark_queued( int n ){
	while( gc_marked_bytes<n && !GC_LIST_IS_EMPTY( gc_queued_list ) ){
		gc_object *p=gc_queued_list.succ;
		GC_REMOVE_NODE( p );
		GC_INSERT_NODE( p,&gc_marked_list );
		gc_marked_bytes+=(p->flags & ~7);
		p->mark();
	}
}

//returns reclaimed bytes
int gc_sweep(){

	int reclaimed_bytes=gc_alloced_bytes-gc_marked_bytes;
	
	if( reclaimed_bytes ){
	
		//append unmarked list to end of free list
		gc_object *head=gc_unmarked_list.succ;
		gc_object *tail=gc_unmarked_list.pred;
		gc_object *succ=&gc_free_list;
		gc_object *pred=succ->pred;
		head->pred=pred;
		tail->succ=succ;
		pred->succ=head;
		succ->pred=tail;
		
		gc_free_bytes+=reclaimed_bytes;
	}
	
	//move marked to unmarked.
	gc_unmarked_list=gc_marked_list;
	gc_unmarked_list.succ->pred=gc_unmarked_list.pred->succ=&gc_unmarked_list;
	
	//clear marked.
	GC_CLEAR_LIST( gc_marked_list );
	
	//adjust sizes
	gc_alloced_bytes=gc_marked_bytes;
	gc_marked_bytes=0;
	gc_markbit^=1;
	
	return reclaimed_bytes;
}

void gc_collect_all(){

//	printf( "Mark locals\n" );fflush( stdout );
	gc_mark_locals();

//	printf( "Mark queued\n" );fflush( stdout );
	gc_mark_queued( 0x7fffffff );

//	printf( "sweep\n" );fflush( stdout );	
	gc_sweep();

//	printf( "Mark roots\n" );fflush( stdout );
	gc_mark_roots();

#if DEBUG_GC	
	printf( "gc collected:%i\n",reclaimed );fflush( stdout );
#endif
}

void gc_collect(){

	if( gc_locals_sp!=gc_locals ){
//		printf( "GC_LOCALS error\n" );fflush( stdout );
		gc_locals_sp=gc_locals;
	}
	
#if CFG_CPP_GC_MODE==1

#if DEBUG_GC
	int ms=gc_micros();
#endif

	if( gc_new_bytes>(CFG_CPP_GC_TRIGGER) ){
		gc_collect_all();
		gc_new_bytes=0;
	}else{
		gc_mark_queued( (long long)(gc_new_bytes)*(gc_alloced_bytes-gc_new_bytes)/(CFG_CPP_GC_TRIGGER)+gc_new_bytes );
	}

#if DEBUG_GC
	ms=gc_micros()-ms;
	if( ms>=100 ) {printf( "gc time:%i\n",ms );fflush( stdout );}
#endif

#endif

}

// ***** Array *****

template<class T> T *t_memcpy( T *dst,const T *src,int n ){
	memcpy( dst,src,n*sizeof(T) );
	return dst+n;
}

template<class T> T *t_memset( T *dst,int val,int n ){
	memset( dst,val,n*sizeof(T) );
	return dst+n;
}

template<class T> int t_memcmp( const T *x,const T *y,int n ){
	return memcmp( x,y,n*sizeof(T) );
}

template<class T> int t_strlen( const T *p ){
	const T *q=p++;
	while( *q++ ){}
	return q-p;
}

template<class T> T *t_create( int n,T *p ){
	t_memset( p,0,n );
	return p+n;
}

template<class T> T *t_create( int n,T *p,const T *q ){
	t_memcpy( p,q,n );
	return p+n;
}

template<class T> void t_destroy( int n,T *p ){
}

template<class T> void gc_mark_elements( int n,T *p ){
}

template<class T> void gc_mark_elements( int n,T **p ){
	for( int i=0;i<n;++i ) gc_mark( p[i] );
}

template<class T> class Array{
public:
	Array():rep( &nullRep ){
	}

	//Uses default...
//	Array( const Array<T> &t )...
	
	Array( int length ):rep( Rep::alloc( length ) ){
		t_create( rep->length,rep->data );
	}
	
	Array( const T *p,int length ):rep( Rep::alloc(length) ){
		t_create( rep->length,rep->data,p );
	}
	
	~Array(){
	}

	//Uses default...
//	Array &operator=( const Array &t )...
	
	int Length()const{ 
		return rep->length; 
	}
	
	T &At( int index ){
		if( index<0 || index>=rep->length ) dbg_error( "Array index out of range" );
		return rep->data[index]; 
	}
	
	const T &At( int index )const{
		if( index<0 || index>=rep->length ) dbg_error( "Array index out of range" );
		return rep->data[index]; 
	}
	
	T &operator[]( int index ){
		return rep->data[index]; 
	}

	const T &operator[]( int index )const{
		return rep->data[index]; 
	}
	
	Array Slice( int from,int term )const{
		int len=rep->length;
		if( from<0 ){ 
			from+=len;
			if( from<0 ) from=0;
		}else if( from>len ){
			from=len;
		}
		if( term<0 ){
			term+=len;
		}else if( term>len ){
			term=len;
		}
		if( term<=from ) return Array();
		return Array( rep->data+from,term-from );
	}

	Array Slice( int from )const{
		return Slice( from,rep->length );
	}
	
	Array Resize( int newlen )const{
		if( newlen<=0 ) return Array();
		int n=rep->length;
		if( newlen<n ) n=newlen;
		Rep *p=Rep::alloc( newlen );
		T *q=p->data;
		q=t_create( n,q,rep->data );
		q=t_create( (newlen-n),q );
		return Array( p );
	}
	
private:
	struct Rep : public gc_object{
		int length;
		T data[0];
		
		Rep():length(0){
			flags=3;
		}
		
		Rep( int length ):length(length){
		}
		
		~Rep(){
			t_destroy( length,data );
		}
		
		void mark(){
			gc_mark_elements( length,data );
		}
		
		static Rep *alloc( int length ){
			if( !length ) return &nullRep;
			void *p=gc_object_alloc( sizeof(Rep)+length*sizeof(T) );
			return ::new(p) Rep( length );
		}
		
	};
	Rep *rep;
	
	static Rep nullRep;
	
	template<class C> friend void gc_mark( Array<C> t );
	template<class C> friend void gc_mark_q( Array<C> t );
	template<class C> friend Array<C> gc_retain( Array<C> t );
	template<class C> friend void gc_assign( Array<C> &lhs,Array<C> rhs );
	template<class C> friend void gc_mark_elements( int n,Array<C> *p );
	
	Array( Rep *rep ):rep(rep){
	}
};

template<class T> typename Array<T>::Rep Array<T>::nullRep;

template<class T> Array<T> *t_create( int n,Array<T> *p ){
	for( int i=0;i<n;++i ) *p++=Array<T>();
	return p;
}

template<class T> Array<T> *t_create( int n,Array<T> *p,const Array<T> *q ){
	for( int i=0;i<n;++i ) *p++=*q++;
	return p;
}

template<class T> void gc_mark( Array<T> t ){
	gc_mark( t.rep );
}

template<class T> void gc_mark_q( Array<T> t ){
	gc_mark_q( t.rep );
}

template<class T> Array<T> gc_retain( Array<T> t ){
#if CFG_CPP_GC_MODE==2
	gc_retain( t.rep );
#endif
	return t;
}

template<class T> void gc_assign( Array<T> &lhs,Array<T> rhs ){
	gc_mark( rhs.rep );
	lhs=rhs;
}

template<class T> void gc_mark_elements( int n,Array<T> *p ){
	for( int i=0;i<n;++i ) gc_mark( p[i].rep );
}
		
// ***** String *****

static const char *_str_load_err;

class String{
public:
	String():rep( &nullRep ){
	}
	
	String( const String &t ):rep( t.rep ){
		rep->retain();
	}

	String( int n ){
		char buf[256];
		sprintf_s( buf,"%i",n );
		rep=Rep::alloc( t_strlen(buf) );
		for( int i=0;i<rep->length;++i ) rep->data[i]=buf[i];
	}
	
	String( Float n ){
		char buf[256];
		
		//would rather use snprintf, but it's doing weird things in MingW.
		//
		sprintf_s( buf,"%.17lg",n );
		//
		char *p;
		for( p=buf;*p;++p ){
			if( *p=='.' || *p=='e' ) break;
		}
		if( !*p ){
			*p++='.';
			*p++='0';
			*p=0;
		}

		rep=Rep::alloc( t_strlen(buf) );
		for( int i=0;i<rep->length;++i ) rep->data[i]=buf[i];
	}

	String( Char ch,int length ):rep( Rep::alloc(length) ){
		for( int i=0;i<length;++i ) rep->data[i]=ch;
	}

	String( const Char *p ):rep( Rep::alloc(t_strlen(p)) ){
		t_memcpy( rep->data,p,rep->length );
	}

	String( const Char *p,int length ):rep( Rep::alloc(length) ){
		t_memcpy( rep->data,p,rep->length );
	}
	
#if __OBJC__	
	String( NSString *nsstr ):rep( Rep::alloc([nsstr length]) ){
		unichar *buf=(unichar*)malloc( rep->length * sizeof(unichar) );
		[nsstr getCharacters:buf range:NSMakeRange(0,rep->length)];
		for( int i=0;i<rep->length;++i ) rep->data[i]=buf[i];
		free( buf );
	}
#endif

#if __cplusplus_winrt
	String( Platform::String ^str ):rep( Rep::alloc(str->Length()) ){
		for( int i=0;i<rep->length;++i ) rep->data[i]=str->Data()[i];
	}
#endif

	~String(){
		rep->release();
	}
	
	template<class C> String( const C *p ):rep( Rep::alloc(t_strlen(p)) ){
		for( int i=0;i<rep->length;++i ) rep->data[i]=p[i];
	}
	
	template<class C> String( const C *p,int length ):rep( Rep::alloc(length) ){
		for( int i=0;i<rep->length;++i ) rep->data[i]=p[i];
	}
	
	int Length()const{
		return rep->length;
	}
	
	const Char *Data()const{
		return rep->data;
	}
	
	Char At( int index )const{
		if( index<0 || index>=rep->length ) dbg_error( "Character index out of range" );
		return rep->data[index]; 
	}
	
	Char operator[]( int index )const{
		return rep->data[index];
	}
	
	String &operator=( const String &t ){
		t.rep->retain();
		rep->release();
		rep=t.rep;
		return *this;
	}
	
	String &operator+=( const String &t ){
		return operator=( *this+t );
	}
	
	int Compare( const String &t )const{
		int n=rep->length<t.rep->length ? rep->length : t.rep->length;
		for( int i=0;i<n;++i ){
			if( int q=(int)(rep->data[i])-(int)(t.rep->data[i]) ) return q;
		}
		return rep->length-t.rep->length;
	}
	
	bool operator==( const String &t )const{
		return rep->length==t.rep->length && t_memcmp( rep->data,t.rep->data,rep->length )==0;
	}
	
	bool operator!=( const String &t )const{
		return rep->length!=t.rep->length || t_memcmp( rep->data,t.rep->data,rep->length )!=0;
	}
	
	bool operator<( const String &t )const{
		return Compare( t )<0;
	}
	
	bool operator<=( const String &t )const{
		return Compare( t )<=0;
	}
	
	bool operator>( const String &t )const{
		return Compare( t )>0;
	}
	
	bool operator>=( const String &t )const{
		return Compare( t )>=0;
	}
	
	String operator+( const String &t )const{
		if( !rep->length ) return t;
		if( !t.rep->length ) return *this;
		Rep *p=Rep::alloc( rep->length+t.rep->length );
		Char *q=p->data;
		q=t_memcpy( q,rep->data,rep->length );
		q=t_memcpy( q,t.rep->data,t.rep->length );
		return String( p );
	}
	
	int Find( String find,int start=0 )const{
		if( start<0 ) start=0;
		while( start+find.rep->length<=rep->length ){
			if( !t_memcmp( rep->data+start,find.rep->data,find.rep->length ) ) return start;
			++start;
		}
		return -1;
	}
	
	int FindLast( String find )const{
		int start=rep->length-find.rep->length;
		while( start>=0 ){
			if( !t_memcmp( rep->data+start,find.rep->data,find.rep->length ) ) return start;
			--start;
		}
		return -1;
	}
	
	int FindLast( String find,int start )const{
		if( start>rep->length-find.rep->length ) start=rep->length-find.rep->length;
		while( start>=0 ){
			if( !t_memcmp( rep->data+start,find.rep->data,find.rep->length ) ) return start;
			--start;
		}
		return -1;
	}
	
	String Trim()const{
		int i=0,i2=rep->length;
		while( i<i2 && rep->data[i]<=32 ) ++i;
		while( i2>i && rep->data[i2-1]<=32 ) --i2;
		if( i==0 && i2==rep->length ) return *this;
		return String( rep->data+i,i2-i );
	}

	Array<String> Split( String sep )const{
	
		if( !sep.rep->length ){
			Array<String> bits( rep->length );
			for( int i=0;i<rep->length;++i ){
				bits[i]=String( (Char)(*this)[i],1 );
			}
			return bits;
		}
		
		int i=0,i2,n=1;
		while( (i2=Find( sep,i ))!=-1 ){
			++n;
			i=i2+sep.rep->length;
		}
		Array<String> bits( n );
		if( n==1 ){
			bits[0]=*this;
			return bits;
		}
		i=0;n=0;
		while( (i2=Find( sep,i ))!=-1 ){
			bits[n++]=Slice( i,i2 );
			i=i2+sep.rep->length;
		}
		bits[n]=Slice( i );
		return bits;
	}

	String Join( Array<String> bits )const{
		if( bits.Length()==0 ) return String();
		if( bits.Length()==1 ) return bits[0];
		int newlen=rep->length * (bits.Length()-1);
		for( int i=0;i<bits.Length();++i ){
			newlen+=bits[i].rep->length;
		}
		Rep *p=Rep::alloc( newlen );
		Char *q=p->data;
		q=t_memcpy( q,bits[0].rep->data,bits[0].rep->length );
		for( int i=1;i<bits.Length();++i ){
			q=t_memcpy( q,rep->data,rep->length );
			q=t_memcpy( q,bits[i].rep->data,bits[i].rep->length );
		}
		return String( p );
	}

	String Replace( String find,String repl )const{
		int i=0,i2,newlen=0;
		while( (i2=Find( find,i ))!=-1 ){
			newlen+=(i2-i)+repl.rep->length;
			i=i2+find.rep->length;
		}
		if( !i ) return *this;
		newlen+=rep->length-i;
		Rep *p=Rep::alloc( newlen );
		Char *q=p->data;
		i=0;
		while( (i2=Find( find,i ))!=-1 ){
			q=t_memcpy( q,rep->data+i,i2-i );
			q=t_memcpy( q,repl.rep->data,repl.rep->length );
			i=i2+find.rep->length;
		}
		q=t_memcpy( q,rep->data+i,rep->length-i );
		return String( p );
	}

	String ToLower()const{
		for( int i=0;i<rep->length;++i ){
			Char t=tolower( rep->data[i] );
			if( t==rep->data[i] ) continue;
			Rep *p=Rep::alloc( rep->length );
			Char *q=p->data;
			t_memcpy( q,rep->data,i );
			for( q[i++]=t;i<rep->length;++i ){
				q[i]=tolower( rep->data[i] );
			}
			return String( p );
		}
		return *this;
	}

	String ToUpper()const{
		for( int i=0;i<rep->length;++i ){
			Char t=toupper( rep->data[i] );
			if( t==rep->data[i] ) continue;
			Rep *p=Rep::alloc( rep->length );
			Char *q=p->data;
			t_memcpy( q,rep->data,i );
			for( q[i++]=t;i<rep->length;++i ){
				q[i]=toupper( rep->data[i] );
			}
			return String( p );
		}
		return *this;
	}
	
	bool Contains( String sub )const{
		return Find( sub )!=-1;
	}

	bool StartsWith( String sub )const{
		return sub.rep->length<=rep->length && !t_memcmp( rep->data,sub.rep->data,sub.rep->length );
	}

	bool EndsWith( String sub )const{
		return sub.rep->length<=rep->length && !t_memcmp( rep->data+rep->length-sub.rep->length,sub.rep->data,sub.rep->length );
	}
	
	String Slice( int from,int term )const{
		int len=rep->length;
		if( from<0 ){
			from+=len;
			if( from<0 ) from=0;
		}else if( from>len ){
			from=len;
		}
		if( term<0 ){
			term+=len;
		}else if( term>len ){
			term=len;
		}
		if( term<from ) return String();
		if( from==0 && term==len ) return *this;
		return String( rep->data+from,term-from );
	}

	String Slice( int from )const{
		return Slice( from,rep->length );
	}
	
	Array<int> ToChars()const{
		Array<int> chars( rep->length );
		for( int i=0;i<rep->length;++i ) chars[i]=rep->data[i];
		return chars;
	}
	
	int ToInt()const{
		char buf[64];
		return atoi( ToCString<char>( buf,sizeof(buf) ) );
	}
	
	Float ToFloat()const{
		char buf[256];
		return atof( ToCString<char>( buf,sizeof(buf) ) );
	}

	template<class C> class CString{
		struct Rep{
			int refs;
			C data[1];
		};
		Rep *_rep;
	public:
		template<class T> CString( const T *data,int length ){
			_rep=(Rep*)malloc( length*sizeof(C)+sizeof(Rep) );
			_rep->refs=1;
			_rep->data[length]=0;
			for( int i=0;i<length;++i ){
				_rep->data[i]=(C)data[i];
			}
		}
		CString( const CString &c ):_rep(c._rep){
			++_rep->refs;
		}
		~CString(){
			if( !--_rep->refs ) free( _rep );
		}
		CString &operator=( const CString &c ){
			++c._rep->refs;
			if( !--_rep->refs ) free( _rep );
			_rep=c._rep;
			return *this;
		}
		operator const C*()const{ 
			return _rep->data;
		}
	};
	
	template<class C> CString<C> ToCString()const{
		return CString<C>( rep->data,rep->length );
	}

	template<class C> C *ToCString( C *p,int length )const{
		if( --length>rep->length ) length=rep->length;
		for( int i=0;i<length;++i ) p[i]=rep->data[i];
		p[length]=0;
		return p;
	}

#if __OBJC__	
	NSString *ToNSString()const{
		return [NSString stringWithCharacters:ToCString<unichar>() length:rep->length];
	}
#endif

#if __cplusplus_winrt
	Platform::String ^ToWinRTString()const{
		return ref new Platform::String( rep->data,rep->length );
	}
#endif

	bool Save( FILE *fp ){
		std::vector<unsigned char> buf;
		Save( buf );
		return buf.size() ? fwrite( &buf[0],1,buf.size(),fp )==buf.size() : true;
	}
	
	void Save( std::vector<unsigned char> &buf ){
	
		Char *p=rep->data;
		Char *e=p+rep->length;
		
		while( p<e ){
			Char c=*p++;
			if( c<0x80 ){
				buf.push_back( c );
			}else if( c<0x800 ){
				buf.push_back( 0xc0 | (c>>6) );
				buf.push_back( 0x80 | (c & 0x3f) );
			}else{
				buf.push_back( 0xe0 | (c>>12) );
				buf.push_back( 0x80 | ((c>>6) & 0x3f) );
				buf.push_back( 0x80 | (c & 0x3f) );
			}
		}
	}
	
	static String FromChars( Array<int> chars ){
		int n=chars.Length();
		Rep *p=Rep::alloc( n );
		for( int i=0;i<n;++i ){
			p->data[i]=chars[i];
		}
		return String( p );
	}

	static String Load( FILE *fp ){
		unsigned char tmp[4096];
		std::vector<unsigned char> buf;
		for(;;){
			int n=fread( tmp,1,4096,fp );
			if( n>0 ) buf.insert( buf.end(),tmp,tmp+n );
			if( n!=4096 ) break;
		}
		return buf.size() ? String::Load( &buf[0],buf.size() ) : String();
	}
	
	static String Load( unsigned char *p,int n ){
	
		_str_load_err=0;
		
		unsigned char *e=p+n;
		std::vector<Char> chars;
		
		int t0=n>0 ? p[0] : -1;
		int t1=n>1 ? p[1] : -1;

		if( t0==0xfe && t1==0xff ){
			p+=2;
			while( p<e-1 ){
				int c=*p++;
				chars.push_back( (c<<8)|*p++ );
			}
		}else if( t0==0xff && t1==0xfe ){
			p+=2;
			while( p<e-1 ){
				int c=*p++;
				chars.push_back( (*p++<<8)|c );
			}
		}else{
			int t2=n>2 ? p[2] : -1;
			if( t0==0xef && t1==0xbb && t2==0xbf ) p+=3;
			unsigned char *q=p;
			bool fail=false;
			while( p<e ){
				unsigned int c=*p++;
				if( c & 0x80 ){
					if( (c & 0xe0)==0xc0 ){
						if( p>=e || (p[0] & 0xc0)!=0x80 ){
							fail=true;
							break;
						}
						c=((c & 0x1f)<<6) | (p[0] & 0x3f);
						p+=1;
					}else if( (c & 0xf0)==0xe0 ){
						if( p+1>=e || (p[0] & 0xc0)!=0x80 || (p[1] & 0xc0)!=0x80 ){
							fail=true;
							break;
						}
						c=((c & 0x0f)<<12) | ((p[0] & 0x3f)<<6) | (p[1] & 0x3f);
						p+=2;
					}else{
						fail=true;
						break;
					}
				}
				chars.push_back( c );
			}
			if( fail ){
				_str_load_err="Invalid UTF-8";
				return String( q,n );
			}
		}
		return chars.size() ? String( &chars[0],chars.size() ) : String();
	}

private:
	
	struct Rep{
		int refs;
		int length;
		Char data[0];
		
		Rep():refs(1),length(0){
		}
		
		Rep( int length ):refs(1),length(length){
		}
		
		void retain(){
			++refs;
		}
		
		void release(){
			if( --refs || !length ) return;
			free( this );
		}

		static Rep *alloc( int length ){
			if( !length ) return &nullRep;
			void *p=malloc( sizeof(Rep)+length*sizeof(Char) );
			return new(p) Rep( length );
		}
	};
	Rep *rep;
	
	static Rep nullRep;
	
	String( Rep *rep ):rep(rep){
	}
};

String::Rep String::nullRep;

String *t_create( int n,String *p ){
	for( int i=0;i<n;++i ) new( &p[i] ) String();
	return p+n;
}

String *t_create( int n,String *p,const String *q ){
	for( int i=0;i<n;++i ) new( &p[i] ) String( q[i] );
	return p+n;
}

void t_destroy( int n,String *p ){
	for( int i=0;i<n;++i ) p[i].~String();
}

// ***** Object *****

String dbg_stacktrace();

class Object : public gc_object{
public:
	virtual bool Equals( Object *obj ){
		return this==obj;
	}
	
	virtual int Compare( Object *obj ){
		return (char*)this-(char*)obj;
	}
	
	virtual String debug(){
		return "+Object\n";
	}
};

class ThrowableObject : public Object{
#ifndef NDEBUG
public:
	String stackTrace;
	ThrowableObject():stackTrace( dbg_stacktrace() ){}
#endif
};

struct gc_interface{
	virtual ~gc_interface(){}
};

//***** Debugger *****

//#define Error bbError
//#define Print bbPrint

int bbPrint( String t );

#define dbg_stream stderr

#if _MSC_VER
#define dbg_typeof decltype
#else
#define dbg_typeof __typeof__
#endif 

struct dbg_func;
struct dbg_var_type;

static int dbg_suspend;
static int dbg_stepmode;

const char *dbg_info;
String dbg_exstack;

static void *dbg_var_buf[65536*3];
static void **dbg_var_ptr=dbg_var_buf;

static dbg_func *dbg_func_buf[1024];
static dbg_func **dbg_func_ptr=dbg_func_buf;

String dbg_type( bool *p ){
	return "Bool";
}

String dbg_type( int *p ){
	return "Int";
}

String dbg_type( Float *p ){
	return "Float";
}

String dbg_type( String *p ){
	return "String";
}

template<class T> String dbg_type( T *p ){
	return "Object";
}

template<class T> String dbg_type( Array<T> *p ){
	return dbg_type( &(*p)[0] )+"[]";
}

String dbg_value( bool *p ){
	return *p ? "True" : "False";
}

String dbg_value( int *p ){
	return String( *p );
}

String dbg_value( Float *p ){
	return String( *p );
}

String dbg_value( String *p ){
	String t=*p;
	if( t.Length()>100 ) t=t.Slice( 0,100 )+"...";
	t=t.Replace( "\"","~q" );
	t=t.Replace( "\t","~t" );
	t=t.Replace( "\n","~n" );
	t=t.Replace( "\r","~r" );
	return String("\"")+t+"\"";
}

template<class T> String dbg_value( T *t ){
	Object *p=dynamic_cast<Object*>( *t );
	char buf[64];
	sprintf_s( buf,"%p",p );
	return String("@") + (buf[0]=='0' && buf[1]=='x' ? buf+2 : buf );
}

template<class T> String dbg_value( Array<T> *p ){
	String t="[";
	int n=(*p).Length();
	for( int i=0;i<n;++i ){
		if( i ) t+=",";
		t+=dbg_value( &(*p)[i] );
	}
	return t+"]";
}

template<class T> String dbg_decl( const char *id,T *ptr ){
	return String( id )+":"+dbg_type(ptr)+"="+dbg_value(ptr)+"\n";
}

struct dbg_var_type{
	virtual String type( void *p )=0;
	virtual String value( void *p )=0;
};

template<class T> struct dbg_var_type_t : public dbg_var_type{

	String type( void *p ){
		return dbg_type( (T*)p );
	}
	
	String value( void *p ){
		return dbg_value( (T*)p );
	}
	
	static dbg_var_type_t<T> info;
};
template<class T> dbg_var_type_t<T> dbg_var_type_t<T>::info;

struct dbg_blk{
	void **var_ptr;
	
	dbg_blk():var_ptr(dbg_var_ptr){
		if( dbg_stepmode=='l' ) --dbg_suspend;
	}
	
	~dbg_blk(){
		if( dbg_stepmode=='l' ) ++dbg_suspend;
		dbg_var_ptr=var_ptr;
	}
};

struct dbg_func : public dbg_blk{
	const char *id;
	const char *info;

	dbg_func( const char *p ):id(p),info(dbg_info){
		*dbg_func_ptr++=this;
		if( dbg_stepmode=='s' ) --dbg_suspend;
	}
	
	~dbg_func(){
		if( dbg_stepmode=='s' ) ++dbg_suspend;
		--dbg_func_ptr;
		dbg_info=info;
	}
};

int dbg_print( String t ){
	static char *buf;
	static int len;
	int n=t.Length();
	if( n+100>len ){
		len=n+100;
		free( buf );
		buf=(char*)malloc( len );
	}
	buf[n]='\n';
	for( int i=0;i<n;++i ) buf[i]=t[i];
	fwrite( buf,n+1,1,dbg_stream );
	fflush( dbg_stream );
	return 0;
}

void dbg_callstack(){

	void **var_ptr=dbg_var_buf;
	dbg_func **func_ptr=dbg_func_buf;
	
	while( var_ptr!=dbg_var_ptr ){
		while( func_ptr!=dbg_func_ptr && var_ptr==(*func_ptr)->var_ptr ){
			const char *id=(*func_ptr++)->id;
			const char *info=func_ptr!=dbg_func_ptr ? (*func_ptr)->info : dbg_info;
			fprintf( dbg_stream,"+%s;%s\n",id,info );
		}
		void *vp=*var_ptr++;
		const char *nm=(const char*)*var_ptr++;
		dbg_var_type *ty=(dbg_var_type*)*var_ptr++;
		dbg_print( String(nm)+":"+ty->type(vp)+"="+ty->value(vp) );
	}
	while( func_ptr!=dbg_func_ptr ){
		const char *id=(*func_ptr++)->id;
		const char *info=func_ptr!=dbg_func_ptr ? (*func_ptr)->info : dbg_info;
		fprintf( dbg_stream,"+%s;%s\n",id,info );
	}
}

String dbg_stacktrace(){
	if( !dbg_info || !dbg_info[0] ) return "";
	String str=String( dbg_info )+"\n";
	dbg_func **func_ptr=dbg_func_ptr;
	if( func_ptr==dbg_func_buf ) return str;
	while( --func_ptr!=dbg_func_buf ){
		str+=String( (*func_ptr)->info )+"\n";
	}
	return str;
}

void dbg_throw( const char *err ){
	dbg_exstack=dbg_stacktrace();
	throw err;
}

void dbg_stop(){

#if TARGET_OS_IPHONE
	dbg_throw( "STOP" );
#endif

	fprintf( dbg_stream,"{{~~%s~~}}\n",dbg_info );
	dbg_callstack();
	dbg_print( "" );
	
	for(;;){

		char buf[256];
		char *e=fgets( buf,256,stdin );
		if( !e ) exit( -1 );
		
		e=strchr( buf,'\n' );
		if( !e ) exit( -1 );
		
		*e=0;
		
		Object *p;
		
		switch( buf[0] ){
		case '?':
			break;
		case 'r':	//run
			dbg_suspend=0;		
			dbg_stepmode=0;
			return;
		case 's':	//step
			dbg_suspend=1;
			dbg_stepmode='s';
			return;
		case 'e':	//enter func
			dbg_suspend=1;
			dbg_stepmode='e';
			return;
		case 'l':	//leave block
			dbg_suspend=0;
			dbg_stepmode='l';
			return;
		case '@':	//dump object
			p=0;
			sscanf_s( buf+1,"%p",&p );
			if( p ){
				dbg_print( p->debug() );
			}else{
				dbg_print( "" );
			}
			break;
		case 'q':	//quit!
			exit( 0 );
			break;			
		default:
			printf( "????? %s ?????",buf );fflush( stdout );
			exit( -1 );
		}
	}
}

void dbg_error( const char *err ){

#if TARGET_OS_IPHONE
	dbg_throw( err );
#endif

	for(;;){
		bbPrint( String("Monkey Runtime Error : ")+err );
		bbPrint( dbg_stacktrace() );
		dbg_stop();
	}
}

#define DBG_INFO(X) dbg_info=(X);if( dbg_suspend>0 ) dbg_stop();

#define DBG_ENTER(P) dbg_func _dbg_func(P);

#define DBG_BLOCK() dbg_blk _dbg_blk;

#define DBG_GLOBAL( ID,NAME )	//TODO!

#define DBG_LOCAL( ID,NAME )\
*dbg_var_ptr++=&ID;\
*dbg_var_ptr++=(void*)NAME;\
*dbg_var_ptr++=&dbg_var_type_t<dbg_typeof(ID)>::info;

//**** main ****

int argc;
const char **argv;

Float D2R=0.017453292519943295f;
Float R2D=57.29577951308232f;

int bbPrint( String t ){

	static std::vector<unsigned char> buf;
	buf.clear();
	t.Save( buf );
	buf.push_back( '\n' );
	buf.push_back( 0 );
	
#if __cplusplus_winrt	//winrt?

#if CFG_WINRT_PRINT_ENABLED
	OutputDebugStringA( (const char*)&buf[0] );
#endif

#elif _WIN32			//windows?

	fputs( (const char*)&buf[0],stdout );
	fflush( stdout );

#elif __APPLE__			//macos/ios?

	fputs( (const char*)&buf[0],stdout );
	fflush( stdout );
	
#elif __linux			//linux?

#if CFG_ANDROID_PRINT_ENABLED
	LOGI( (const char*)&buf[0] );
#else
	fputs( (const char*)&buf[0],stdout );
	fflush( stdout );
#endif

#endif

	return 0;
}

class BBExitApp{
};

int bbError( String err ){
	if( !err.Length() ){
#if __cplusplus_winrt
		throw BBExitApp();
#else
		exit( 0 );
#endif
	}
	dbg_error( err.ToCString<char>() );
	return 0;
}

int bbDebugLog( String t ){
	bbPrint( t );
	return 0;
}

int bbDebugStop(){
	dbg_stop();
	return 0;
}

int bbInit();
int bbMain();

#if _MSC_VER

static void _cdecl seTranslator( unsigned int ex,EXCEPTION_POINTERS *p ){

	switch( ex ){
	case EXCEPTION_ACCESS_VIOLATION:dbg_error( "Memory access violation" );
	case EXCEPTION_ILLEGAL_INSTRUCTION:dbg_error( "Illegal instruction" );
	case EXCEPTION_INT_DIVIDE_BY_ZERO:dbg_error( "Integer divide by zero" );
	case EXCEPTION_STACK_OVERFLOW:dbg_error( "Stack overflow" );
	}
	dbg_error( "Unknown exception" );
}

#else

void sighandler( int sig  ){
	switch( sig ){
	case SIGSEGV:dbg_error( "Memory access violation" );
	case SIGILL:dbg_error( "Illegal instruction" );
	case SIGFPE:dbg_error( "Floating point exception" );
#if !_WIN32
	case SIGBUS:dbg_error( "Bus error" );
#endif	
	}
	dbg_error( "Unknown signal" );
}

#endif

//entry point call by target main()...
//
int bb_std_main( int argc,const char **argv ){

	::argc=argc;
	::argv=argv;
	
#if _MSC_VER

	_set_se_translator( seTranslator );

#else
	
	signal( SIGSEGV,sighandler );
	signal( SIGILL,sighandler );
	signal( SIGFPE,sighandler );
#if !_WIN32
	signal( SIGBUS,sighandler );
#endif

#endif

	gc_init1();

	bbInit();
	
	gc_init2();

	bbMain();

	return 0;
}


//***** game.h *****

struct BBGameEvent{
	enum{
		None=0,
		KeyDown=1,KeyUp=2,KeyChar=3,
		MouseDown=4,MouseUp=5,MouseMove=6,
		TouchDown=7,TouchUp=8,TouchMove=9,
		MotionAccel=10
	};
};

class BBGameDelegate : public Object{
public:
	virtual void StartGame(){}
	virtual void SuspendGame(){}
	virtual void ResumeGame(){}
	virtual void UpdateGame(){}
	virtual void RenderGame(){}
	virtual void KeyEvent( int event,int data ){}
	virtual void MouseEvent( int event,int data,float x,float y ){}
	virtual void TouchEvent( int event,int data,float x,float y ){}
	virtual void MotionEvent( int event,int data,float x,float y,float z ){}
	virtual void DiscardGraphics(){}
};

class BBGame{
public:
	BBGame();
	virtual ~BBGame(){}
	
	static BBGame *Game(){ return _game; }
	
	virtual void SetDelegate( BBGameDelegate *delegate );
	virtual BBGameDelegate *Delegate(){ return _delegate; }
	
	virtual void SetKeyboardEnabled( bool enabled );
	virtual bool KeyboardEnabled();
	
	virtual void SetUpdateRate( int updateRate );
	virtual int UpdateRate();
	
	virtual bool Started(){ return _started; }
	virtual bool Suspended(){ return _suspended; }
	
	virtual int Millisecs();
	virtual void GetDate( Array<int> date );
	virtual int SaveState( String state );
	virtual String LoadState();
	virtual String LoadString( String path );
	virtual bool PollJoystick( int port,Array<Float> joyx,Array<Float> joyy,Array<Float> joyz,Array<bool> buttons );
	virtual void OpenUrl( String url );
	virtual void SetMouseVisible( bool visible );
	
	//***** cpp extensions *****
	virtual String PathToFilePath( String path );
	virtual FILE *OpenFile( String path,String mode );
	virtual unsigned char *LoadData( String path,int *plength );
	
	//***** INTERNAL *****
	virtual void Die( ThrowableObject *ex );
	virtual void gc_collect();
	virtual void StartGame();
	virtual void SuspendGame();
	virtual void ResumeGame();
	virtual void UpdateGame();
	virtual void RenderGame();
	virtual void KeyEvent( int ev,int data );
	virtual void MouseEvent( int ev,int data,float x,float y );
	virtual void TouchEvent( int ev,int data,float x,float y );
	virtual void MotionEvent( int ev,int data,float x,float y,float z );
	virtual void DiscardGraphics();

protected:

	static BBGame *_game;

	BBGameDelegate *_delegate;
	bool _keyboardEnabled;
	int _updateRate;
	bool _started;
	bool _suspended;
};

//***** game.cpp *****

BBGame *BBGame::_game;

BBGame::BBGame():
_delegate( 0 ),
_keyboardEnabled( false ),
_updateRate( 0 ),
_started( false ),
_suspended( false ){
	_game=this;
}

void BBGame::SetDelegate( BBGameDelegate *delegate ){
	_delegate=delegate;
}

void BBGame::SetKeyboardEnabled( bool enabled ){
	_keyboardEnabled=enabled;
}

bool BBGame::KeyboardEnabled(){
	return _keyboardEnabled;
}

void BBGame::SetUpdateRate( int updateRate ){
	_updateRate=updateRate;
}

int BBGame::UpdateRate(){
	return _updateRate;
}

int BBGame::Millisecs(){
	return 0;
}

void BBGame::GetDate( Array<int> date ){
	int n=date.Length();
	if( n>0 ){
		time_t t=time( 0 );
		
#if _MSC_VER
		struct tm tii;
		struct tm *ti=&tii;
		localtime_s( ti,&t );
#else
		struct tm *ti=localtime( &t );
#endif

		date[0]=ti->tm_year+1900;
		if( n>1 ){ 
			date[1]=ti->tm_mon+1;
			if( n>2 ){
				date[2]=ti->tm_mday;
				if( n>3 ){
					date[3]=ti->tm_hour;
					if( n>4 ){
						date[4]=ti->tm_min;
						if( n>5 ){
							date[5]=ti->tm_sec;
							if( n>6 ){
								date[6]=0;
							}
						}
					}
				}
			}
		}
	}
}

int BBGame::SaveState( String state ){
	if( FILE *f=OpenFile( "./.monkeystate","wb" ) ){
		bool ok=state.Save( f );
		fclose( f );
		return ok ? 0 : -2;
	}
	return -1;
}

String BBGame::LoadState(){
	if( FILE *f=OpenFile( "./.monkeystate","rb" ) ){
		String str=String::Load( f );
		fclose( f );
		return str;
	}
	return "";
}

String BBGame::LoadString( String path ){
	if( FILE *fp=OpenFile( path,"rb" ) ){
		String str=String::Load( fp );
		fclose( fp );
		return str;
	}
	return "";
}

bool BBGame::PollJoystick( int port,Array<Float> joyx,Array<Float> joyy,Array<Float> joyz,Array<bool> buttons ){
	return false;
}

void BBGame::OpenUrl( String url ){
}

void BBGame::SetMouseVisible( bool visible ){
}

//***** C++ Game *****

String BBGame::PathToFilePath( String path ){
	return path;
}

FILE *BBGame::OpenFile( String path,String mode ){
	path=PathToFilePath( path );
	if( path=="" ) return 0;
	
#if __cplusplus_winrt
	path=path.Replace( "/","\\" );
	FILE *f;
	if( _wfopen_s( &f,path.ToCString<wchar_t>(),mode.ToCString<wchar_t>() ) ) return 0;
	return f;
#elif _WIN32
	return _wfopen( path.ToCString<wchar_t>(),mode.ToCString<wchar_t>() );
#else
	return fopen( path.ToCString<char>(),mode.ToCString<char>() );
#endif
}

unsigned char *BBGame::LoadData( String path,int *plength ){

	FILE *f=OpenFile( path,"rb" );
	if( !f ) return 0;

	const int BUF_SZ=4096;
	std::vector<void*> tmps;
	int length=0;
	
	for(;;){
		void *p=malloc( BUF_SZ );
		int n=fread( p,1,BUF_SZ,f );
		tmps.push_back( p );
		length+=n;
		if( n!=BUF_SZ ) break;
	}
	fclose( f );
	
	unsigned char *data=(unsigned char*)malloc( length );
	unsigned char *p=data;
	
	int sz=length;
	for( int i=0;i<tmps.size();++i ){
		int n=sz>BUF_SZ ? BUF_SZ : sz;
		memcpy( p,tmps[i],n );
		free( tmps[i] );
		sz-=n;
		p+=n;
	}
	
	*plength=length;
	
	gc_ext_malloced( length );
	
	return data;
}

//***** INTERNAL *****

void BBGame::Die( ThrowableObject *ex ){
	bbPrint( "Monkey Runtime Error : Uncaught Monkey Exception" );
#ifndef NDEBUG
	bbPrint( ex->stackTrace );
#endif
	exit( -1 );
}

void BBGame::gc_collect(){
	gc_mark( _delegate );
	::gc_collect();
}

void BBGame::StartGame(){

	if( _started ) return;
	_started=true;
	
	try{
		_delegate->StartGame();
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::SuspendGame(){

	if( !_started || _suspended ) return;
	_suspended=true;
	
	try{
		_delegate->SuspendGame();
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::ResumeGame(){

	if( !_started || !_suspended ) return;
	_suspended=false;
	
	try{
		_delegate->ResumeGame();
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::UpdateGame(){

	if( !_started || _suspended ) return;
	
	try{
		_delegate->UpdateGame();
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::RenderGame(){

	if( !_started ) return;
	
	try{
		_delegate->RenderGame();
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::KeyEvent( int ev,int data ){

	if( !_started ) return;
	
	try{
		_delegate->KeyEvent( ev,data );
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::MouseEvent( int ev,int data,float x,float y ){

	if( !_started ) return;
	
	try{
		_delegate->MouseEvent( ev,data,x,y );
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::TouchEvent( int ev,int data,float x,float y ){

	if( !_started ) return;
	
	try{
		_delegate->TouchEvent( ev,data,x,y );
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::MotionEvent( int ev,int data,float x,float y,float z ){

	if( !_started ) return;
	
	try{
		_delegate->MotionEvent( ev,data,x,y,z );
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}

void BBGame::DiscardGraphics(){

	if( !_started ) return;
	
	try{
		_delegate->DiscardGraphics();
	}catch( ThrowableObject *ex ){
		Die( ex );
	}
	gc_collect();
}


//***** wavloader.h *****
//
unsigned char *LoadWAV( FILE *f,int *length,int *channels,int *format,int *hertz );

//***** wavloader.cpp *****
//
static const char *readTag( FILE *f ){
	static char buf[8];
	if( fread( buf,4,1,f )!=1 ) return "";
	buf[4]=0;
	return buf;
}

static int readInt( FILE *f ){
	unsigned char buf[4];
	if( fread( buf,4,1,f )!=1 ) return -1;
	return (buf[3]<<24) | (buf[2]<<16) | (buf[1]<<8) | buf[0];
}

static int readShort( FILE *f ){
	unsigned char buf[2];
	if( fread( buf,2,1,f )!=1 ) return -1;
	return (buf[1]<<8) | buf[0];
}

static void skipBytes( int n,FILE *f ){
	char *p=(char*)malloc( n );
	fread( p,n,1,f );
	free( p );
}

unsigned char *LoadWAV( FILE *f,int *plength,int *pchannels,int *pformat,int *phertz ){
	if( !strcmp( readTag( f ),"RIFF" ) ){
		int len=readInt( f )-8;len=len;
		if( !strcmp( readTag( f ),"WAVE" ) ){
			if( !strcmp( readTag( f ),"fmt " ) ){
				int len2=readInt( f );
				int comp=readShort( f );
				if( comp==1 ){
					int chans=readShort( f );
					int hertz=readInt( f );
					int bytespersec=readInt( f );bytespersec=bytespersec;
					int pad=readShort( f );pad=pad;
					int bits=readShort( f );
					int format=bits/8;
					if( len2>16 ) skipBytes( len2-16,f );
					for(;;){
						const char *p=readTag( f );
						if( feof( f ) ) break;
						int size=readInt( f );
						if( strcmp( p,"data" ) ){
							skipBytes( size,f );
							continue;
						}
						unsigned char *data=(unsigned char*)malloc( size );
						if( fread( data,size,1,f )==1 ){
							*plength=size/(chans*format);
							*pchannels=chans;
							*pformat=format;
							*phertz=hertz;
							return data;
						}
						free( data );
					}
				}
			}
		}
	}
	return 0;
}



//***** oggloader.h *****
unsigned char *LoadOGG( FILE *f,int *length,int *channels,int *format,int *hertz );

//***** oggloader.cpp *****
unsigned char *LoadOGG( FILE *f,int *length,int *channels,int *format,int *hertz ){

	int error;
	stb_vorbis *v=stb_vorbis_open_file( f,0,&error,0 );
	if( !v ) return 0;
	
	stb_vorbis_info info=stb_vorbis_get_info( v );
	
	int limit=info.channels*4096;
	int offset=0,total=limit;

	short *data=(short*)malloc( total*2 );
	
	for(;;){
		int n=stb_vorbis_get_frame_short_interleaved( v,info.channels,data+offset,total-offset );
		if( !n ) break;
	
		offset+=n*info.channels;
		
		if( offset+limit>total ){
			total*=2;
			data=(short*)realloc( data,total*2 );
		}
	}
	
	data=(short*)realloc( data,offset*2 );
	
	*length=offset/info.channels;
	*channels=info.channels;
	*format=2;
	*hertz=info.sample_rate;
	
	stb_vorbis_close(v);
	
	return (unsigned char*)data;
}



//***** glfwgame.h *****

struct BBGlfwVideoMode : public Object{
	int Width;
	int Height;
	int RedBits;
	int GreenBits;
	int BlueBits;
	BBGlfwVideoMode( int w,int h,int r,int g,int b ):Width(w),Height(h),RedBits(r),GreenBits(g),BlueBits(b){}
};

class BBGlfwGame : public BBGame{
public:
	BBGlfwGame();

	static BBGlfwGame *GlfwGame(){ return _glfwGame; }
	
	virtual void SetUpdateRate( int hertz );
	virtual int Millisecs();
	virtual bool PollJoystick( int port,Array<Float> joyx,Array<Float> joyy,Array<Float> joyz,Array<bool> buttons );
	virtual void OpenUrl( String url );
	virtual void SetMouseVisible( bool visible );

	virtual String PathToFilePath( String path );

	virtual unsigned char *LoadImageData( String path,int *width,int *height,int *depth );
	virtual unsigned char *LoadAudioData( String path,int *length,int *channels,int *format,int *hertz );
	
	BBGlfwVideoMode *GetGlfwDesktopMode();
	Array<BBGlfwVideoMode*> GetGlfwVideoModes();
	virtual void SetGlfwWindow( int width,int height,int red,int green,int blue,int alpha,int depth,int stencil,bool fullscreen );
	virtual void Run();
	
private:
	static BBGlfwGame *_glfwGame;

	bool _iconified;
	
	double _nextUpdate;
	double _updatePeriod;
		
protected:
	static int TransKey( int key );
	static int KeyToChar( int key );
	
	static void GLFWCALL OnKey( int key,int action );
	static void GLFWCALL OnChar( int chr,int action );
	static void GLFWCALL OnMouseButton( int button,int action );
	static void GLFWCALL OnMousePos( int x,int y );
	static int  GLFWCALL OnWindowClose();
};

//***** glfwgame.cpp *****

#define _QUOTE(X) #X
#define _STRINGIZE( X ) _QUOTE(X)

enum{
	VKEY_BACKSPACE=8,VKEY_TAB,
	VKEY_ENTER=13,
	VKEY_SHIFT=16,
	VKEY_CONTROL=17,
	VKEY_ESC=27,
	VKEY_SPACE=32,
	VKEY_PAGEUP=33,VKEY_PAGEDOWN,VKEY_END,VKEY_HOME,
	VKEY_LEFT=37,VKEY_UP,VKEY_RIGHT,VKEY_DOWN,
	VKEY_INSERT=45,VKEY_DELETE,
	VKEY_0=48,VKEY_1,VKEY_2,VKEY_3,VKEY_4,VKEY_5,VKEY_6,VKEY_7,VKEY_8,VKEY_9,
	VKEY_A=65,VKEY_B,VKEY_C,VKEY_D,VKEY_E,VKEY_F,VKEY_G,VKEY_H,VKEY_I,VKEY_J,
	VKEY_K,VKEY_L,VKEY_M,VKEY_N,VKEY_O,VKEY_P,VKEY_Q,VKEY_R,VKEY_S,VKEY_T,
	VKEY_U,VKEY_V,VKEY_W,VKEY_X,VKEY_Y,VKEY_Z,
	
	VKEY_LSYS=91,VKEY_RSYS,
	
	VKEY_NUM0=96,VKEY_NUM1,VKEY_NUM2,VKEY_NUM3,VKEY_NUM4,
	VKEY_NUM5,VKEY_NUM6,VKEY_NUM7,VKEY_NUM8,VKEY_NUM9,
	VKEY_NUMMULTIPLY=106,VKEY_NUMADD,VKEY_NUMSLASH,
	VKEY_NUMSUBTRACT,VKEY_NUMDECIMAL,VKEY_NUMDIVIDE,

	VKEY_F1=112,VKEY_F2,VKEY_F3,VKEY_F4,VKEY_F5,VKEY_F6,
	VKEY_F7,VKEY_F8,VKEY_F9,VKEY_F10,VKEY_F11,VKEY_F12,

	VKEY_LSHIFT=160,VKEY_RSHIFT,
	VKEY_LCONTROL=162,VKEY_RCONTROL,
	VKEY_LALT=164,VKEY_RALT,

	VKEY_TILDE=192,VKEY_MINUS=189,VKEY_EQUALS=187,
	VKEY_OPENBRACKET=219,VKEY_BACKSLASH=220,VKEY_CLOSEBRACKET=221,
	VKEY_SEMICOLON=186,VKEY_QUOTES=222,
	VKEY_COMMA=188,VKEY_PERIOD=190,VKEY_SLASH=191
};

BBGlfwGame *BBGlfwGame::_glfwGame;

BBGlfwGame::BBGlfwGame():
_iconified( false ){
	_glfwGame=this;
}

//***** BBGame *****

void Init_GL_Exts();

int glfwGraphicsSeq=0;

void BBGlfwGame::SetUpdateRate( int updateRate ){
	BBGame::SetUpdateRate( updateRate );
	if( _updateRate ){
		_updatePeriod=1.0/_updateRate;
		_nextUpdate=glfwGetTime()+_updatePeriod;
	}
}

int BBGlfwGame::Millisecs(){
	return int( glfwGetTime()*1000.0 );
}

bool BBGlfwGame::PollJoystick( int port,Array<Float> joyx,Array<Float> joyy,Array<Float> joyz,Array<bool> buttons ){

	int joy=GLFW_JOYSTICK_1+port;
	if( !glfwGetJoystickParam( joy,GLFW_PRESENT ) ) return false;

	int n_axes=glfwGetJoystickParam( joy,GLFW_AXES );
	int n_buttons=glfwGetJoystickParam( joy,GLFW_BUTTONS );

	float pos[6];
	memset( pos,0,sizeof(pos) );	
	glfwGetJoystickPos( joy,pos,n_axes );
	
	float t;
	switch( n_axes ){
	case 4:	//my saitek...axes=4, buttons=14
		pos[4]=pos[2];
		pos[3]=pos[3];
		pos[2]=0;
		break;
	case 5:	//xbox360...axes=5, buttons=10
		t=pos[3];
		pos[3]=pos[4];
		pos[4]=t;
		break;
	}
	
	joyx[0]=pos[0];joyx[1]=pos[3];
	joyy[0]=pos[1];joyy[1]=pos[4];
	joyz[0]=pos[2];joyz[1]=pos[5];

	//Buttons...
	//	
	unsigned char buts[32];
	memset( buts,0,sizeof(buts) );
	glfwGetJoystickButtons( port,buts,n_buttons );

	for( int i=0;i<n_buttons;++i ) buttons[i]=(buts[i]==GLFW_PRESS);
	return true;
}

void BBGlfwGame::OpenUrl( String url ){
#if _WIN32
	ShellExecute( HWND_DESKTOP,"open",url.ToCString<char>(),0,0,SW_SHOWNORMAL );
#elif __APPLE__
	if( CFURLRef cfurl=CFURLCreateWithBytes( 0,url.ToCString<UInt8>(),url.Length(),kCFStringEncodingASCII,0 ) ){
		LSOpenCFURLRef( cfurl,0 );
		CFRelease( cfurl );
	}
#elif __linux
	system( ( String( "xdg-open \"" )+url+"\"" ).ToCString<char>() );
#endif
}

void BBGlfwGame::SetMouseVisible( bool visible ){
	if( visible ){
		glfwEnable( GLFW_MOUSE_CURSOR );
	}else{
		glfwDisable( GLFW_MOUSE_CURSOR );
	}
}

String BBGlfwGame::PathToFilePath( String path ){
	if( !path.StartsWith( "monkey:" ) ){
		return path;
	}else if( path.StartsWith( "monkey://data/" ) ){
		return String("./data/")+path.Slice(14);
	}else if( path.StartsWith( "monkey://internal/" ) ){
		return String("./internal/")+path.Slice(18);
	}else if( path.StartsWith( "monkey://external/" ) ){
		return String("./external/")+path.Slice(18);
	}
	return "";
}

unsigned char *BBGlfwGame::LoadImageData( String path,int *width,int *height,int *depth ){

	FILE *f=OpenFile( path,"rb" );
	if( !f ) return 0;
	
	unsigned char *data=stbi_load_from_file( f,width,height,depth,0 );
	fclose( f );
	
	if( data ) gc_ext_malloced( (*width)*(*height)*(*depth) );
	
	return data;
}

unsigned char *BBGlfwGame::LoadAudioData( String path,int *length,int *channels,int *format,int *hertz ){

	FILE *f=OpenFile( path,"rb" );
	if( !f ) return 0;
	
	unsigned char *data=0;
	
	if( path.ToLower().EndsWith( ".wav" ) ){
		data=LoadWAV( f,length,channels,format,hertz );
	}else if( path.ToLower().EndsWith( ".ogg" ) ){
		data=LoadOGG( f,length,channels,format,hertz );
	}
	fclose( f );
	
	if( data ) gc_ext_malloced( (*length)*(*channels)*(*format) );
	
	return data;
}

//glfw key to monkey key!
int BBGlfwGame::TransKey( int key ){

	if( key>='0' && key<='9' ) return key;
	if( key>='A' && key<='Z' ) return key;

	switch( key ){

	case ' ':return VKEY_SPACE;
	case ';':return VKEY_SEMICOLON;
	case '=':return VKEY_EQUALS;
	case ',':return VKEY_COMMA;
	case '-':return VKEY_MINUS;
	case '.':return VKEY_PERIOD;
	case '/':return VKEY_SLASH;
	case '~':return VKEY_TILDE;
	case '[':return VKEY_OPENBRACKET;
	case ']':return VKEY_CLOSEBRACKET;
	case '\"':return VKEY_QUOTES;
	case '\\':return VKEY_BACKSLASH;
	
	case '`':return VKEY_TILDE;
	case '\'':return VKEY_QUOTES;

	case GLFW_KEY_LSHIFT:
	case GLFW_KEY_RSHIFT:return VKEY_SHIFT;
	case GLFW_KEY_LCTRL:
	case GLFW_KEY_RCTRL:return VKEY_CONTROL;
	
//	case GLFW_KEY_LSHIFT:return VKEY_LSHIFT;
//	case GLFW_KEY_RSHIFT:return VKEY_RSHIFT;
//	case GLFW_KEY_LCTRL:return VKEY_LCONTROL;
//	case GLFW_KEY_RCTRL:return VKEY_RCONTROL;
	
	case GLFW_KEY_BACKSPACE:return VKEY_BACKSPACE;
	case GLFW_KEY_TAB:return VKEY_TAB;
	case GLFW_KEY_ENTER:return VKEY_ENTER;
	case GLFW_KEY_ESC:return VKEY_ESC;
	case GLFW_KEY_INSERT:return VKEY_INSERT;
	case GLFW_KEY_DEL:return VKEY_DELETE;
	case GLFW_KEY_PAGEUP:return VKEY_PAGEUP;
	case GLFW_KEY_PAGEDOWN:return VKEY_PAGEDOWN;
	case GLFW_KEY_HOME:return VKEY_HOME;
	case GLFW_KEY_END:return VKEY_END;
	case GLFW_KEY_UP:return VKEY_UP;
	case GLFW_KEY_DOWN:return VKEY_DOWN;
	case GLFW_KEY_LEFT:return VKEY_LEFT;
	case GLFW_KEY_RIGHT:return VKEY_RIGHT;
	
	case GLFW_KEY_KP_0:return VKEY_NUM0;
	case GLFW_KEY_KP_1:return VKEY_NUM1;
	case GLFW_KEY_KP_2:return VKEY_NUM2;
	case GLFW_KEY_KP_3:return VKEY_NUM3;
	case GLFW_KEY_KP_4:return VKEY_NUM4;
	case GLFW_KEY_KP_5:return VKEY_NUM5;
	case GLFW_KEY_KP_6:return VKEY_NUM6;
	case GLFW_KEY_KP_7:return VKEY_NUM7;
	case GLFW_KEY_KP_8:return VKEY_NUM8;
	case GLFW_KEY_KP_9:return VKEY_NUM9;
	case GLFW_KEY_KP_DIVIDE:return VKEY_NUMDIVIDE;
	case GLFW_KEY_KP_MULTIPLY:return VKEY_NUMMULTIPLY;
	case GLFW_KEY_KP_SUBTRACT:return VKEY_NUMSUBTRACT;
	case GLFW_KEY_KP_ADD:return VKEY_NUMADD;
	case GLFW_KEY_KP_DECIMAL:return VKEY_NUMDECIMAL;
    	
	case GLFW_KEY_F1:return VKEY_F1;
	case GLFW_KEY_F2:return VKEY_F2;
	case GLFW_KEY_F3:return VKEY_F3;
	case GLFW_KEY_F4:return VKEY_F4;
	case GLFW_KEY_F5:return VKEY_F5;
	case GLFW_KEY_F6:return VKEY_F6;
	case GLFW_KEY_F7:return VKEY_F7;
	case GLFW_KEY_F8:return VKEY_F8;
	case GLFW_KEY_F9:return VKEY_F9;
	case GLFW_KEY_F10:return VKEY_F10;
	case GLFW_KEY_F11:return VKEY_F11;
	case GLFW_KEY_F12:return VKEY_F12;
	}
	return 0;
}

//monkey key to special monkey char
int BBGlfwGame::KeyToChar( int key ){
	switch( key ){
	case VKEY_BACKSPACE:
	case VKEY_TAB:
	case VKEY_ENTER:
	case VKEY_ESC:
		return key;
	case VKEY_PAGEUP:
	case VKEY_PAGEDOWN:
	case VKEY_END:
	case VKEY_HOME:
	case VKEY_LEFT:
	case VKEY_UP:
	case VKEY_RIGHT:
	case VKEY_DOWN:
	case VKEY_INSERT:
		return key | 0x10000;
	case VKEY_DELETE:
		return 127;
	}
	return 0;
}

void BBGlfwGame::OnMouseButton( int button,int action ){
	switch( button ){
	case GLFW_MOUSE_BUTTON_LEFT:button=0;break;
	case GLFW_MOUSE_BUTTON_RIGHT:button=1;break;
	case GLFW_MOUSE_BUTTON_MIDDLE:button=2;break;
	default:return;
	}
	int x,y;
	glfwGetMousePos( &x,&y );
	switch( action ){
	case GLFW_PRESS:
		_glfwGame->MouseEvent( BBGameEvent::MouseDown,button,x,y );
		break;
	case GLFW_RELEASE:
		_glfwGame->MouseEvent( BBGameEvent::MouseUp,button,x,y );
		break;
	}
}

void BBGlfwGame::OnMousePos( int x,int y ){
	_game->MouseEvent( BBGameEvent::MouseMove,-1,x,y );
}

int BBGlfwGame::OnWindowClose(){
	_game->KeyEvent( BBGameEvent::KeyDown,0x1b0 );
	_game->KeyEvent( BBGameEvent::KeyUp,0x1b0 );
	return GL_FALSE;
}

void BBGlfwGame::OnKey( int key,int action ){

	key=TransKey( key );
	if( !key ) return;
	
	switch( action ){
	case GLFW_PRESS:
		_glfwGame->KeyEvent( BBGameEvent::KeyDown,key );
		if( int chr=KeyToChar( key ) ) _game->KeyEvent( BBGameEvent::KeyChar,chr );
		break;
	case GLFW_RELEASE:
		_glfwGame->KeyEvent( BBGameEvent::KeyUp,key );
		break;
	}
}

void BBGlfwGame::OnChar( int chr,int action ){

	switch( action ){
	case GLFW_PRESS:
		_glfwGame->KeyEvent( BBGameEvent::KeyChar,chr );
		break;
	}
}

BBGlfwVideoMode *BBGlfwGame::GetGlfwDesktopMode(){

	GLFWvidmode mode;
	glfwGetDesktopMode( &mode );
	
	return new BBGlfwVideoMode( mode.Width,mode.Height,mode.RedBits,mode.GreenBits,mode.BlueBits );
}

Array<BBGlfwVideoMode*> BBGlfwGame::GetGlfwVideoModes(){
	GLFWvidmode modes[1024];
	int n=glfwGetVideoModes( modes,1024 );
	Array<BBGlfwVideoMode*> bbmodes( n );
	for( int i=0;i<n;++i ){
		bbmodes[i]=new BBGlfwVideoMode( modes[i].Width,modes[i].Height,modes[i].RedBits,modes[i].GreenBits,modes[i].BlueBits );
	}
	return bbmodes;
}

void BBGlfwGame::SetGlfwWindow( int width,int height,int red,int green,int blue,int alpha,int depth,int stencil,bool fullscreen ){

	for( int i=0;i<=GLFW_KEY_LAST;++i ){
		int key=TransKey( i );
		if( key && glfwGetKey( i )==GLFW_PRESS ) KeyEvent( BBGameEvent::KeyUp,key );
	}

	GLFWvidmode desktopMode;
	glfwGetDesktopMode( &desktopMode );

	glfwCloseWindow();
	
	glfwOpenWindowHint( GLFW_WINDOW_NO_RESIZE,CFG_GLFW_WINDOW_RESIZABLE ? GL_FALSE : GL_TRUE );

	glfwOpenWindow( width,height,red,green,blue,alpha,depth,stencil,fullscreen ? GLFW_FULLSCREEN : GLFW_WINDOW );

	++glfwGraphicsSeq;

	if( !fullscreen ){	
		glfwSetWindowPos( (desktopMode.Width-width)/2,(desktopMode.Height-height)/2 );
		glfwSetWindowTitle( _STRINGIZE(CFG_GLFW_WINDOW_TITLE) );
	}

#if CFG_OPENGL_INIT_EXTENSIONS
	Init_GL_Exts();
#endif

#if CFG_GLFW_SWAP_INTERVAL>=0
	glfwSwapInterval( CFG_GLFW_SWAP_INTERVAL );
#endif

	glfwEnable( GLFW_KEY_REPEAT );
	glfwDisable( GLFW_AUTO_POLL_EVENTS );
	glfwSetKeyCallback( OnKey );
	glfwSetCharCallback( OnChar );
	glfwSetMouseButtonCallback( OnMouseButton );
	glfwSetMousePosCallback( OnMousePos );
	glfwSetWindowCloseCallback(	OnWindowClose );
}

void BBGlfwGame::Run(){

#if	CFG_GLFW_WINDOW_WIDTH && CFG_GLFW_WINDOW_HEIGHT

	SetGlfwWindow( CFG_GLFW_WINDOW_WIDTH,CFG_GLFW_WINDOW_HEIGHT,8,8,8,0,CFG_OPENGL_DEPTH_BUFFER_ENABLED ? 32 : 0,0,CFG_GLFW_WINDOW_FULLSCREEN );

#endif

	StartGame();

	RenderGame();
	
	for( ;; ){
	
		glfwPollEvents();
		
		if( !glfwGetWindowParam( GLFW_OPENED ) ) break;
	
		if( glfwGetWindowParam( GLFW_ICONIFIED ) ){
			if( !_suspended ){
				_iconified=true;
				SuspendGame();
			}
		}else if( glfwGetWindowParam( GLFW_ACTIVE ) ){
			if( _suspended ){
				_iconified=false;
				ResumeGame();
				_nextUpdate=glfwGetTime();
			}
		}else if( CFG_MOJO_AUTO_SUSPEND_ENABLED ){
			if( !_suspended ){
				SuspendGame();
			}
		}
	
		if( !_updateRate || _suspended ){
			if( !_iconified ) RenderGame();
			glfwWaitEvents();
			continue;
		}
		
		double delay=_nextUpdate-glfwGetTime();
		if( delay>0 ){
			glfwSleep( delay );
			continue;
		}

		int updates;
		for( updates=0;updates<4;++updates ){
			_nextUpdate+=_updatePeriod;
			UpdateGame();
			if( !_updateRate ) break;
			delay=_nextUpdate-glfwGetTime();
			if( delay>0 ) break;
		}
		
		RenderGame();
		
		if( !_updateRate ) continue;
		
		if( updates==4 ) _nextUpdate=glfwGetTime();
	}
}



//***** monkeygame.h *****

class BBMonkeyGame : public BBGlfwGame{
public:

	static void Main( int args,const char *argv[] );
};

//***** monkeygame.cpp *****

#define _QUOTE(X) #X
#define _STRINGIZE(X) _QUOTE(X)

void BBMonkeyGame::Main( int argc,const char *argv[] ){

	if( !glfwInit() ){
		puts( "glfwInit failed" );
		exit(-1);
	}

	BBMonkeyGame *game=new BBMonkeyGame();
	
	try{
	
		bb_std_main( argc,argv );
		
	}catch( ThrowableObject *ex ){
	
		glfwTerminate();
		
		game->Die( ex );
		
		return;
	}

	if( game->Delegate() ) game->Run();
	
	glfwTerminate();
}


// GLFW mojo runtime.
//
// Copyright 2011 Mark Sibly, all rights reserved.
// No warranty implied; use at your own risk.

//***** gxtkGraphics.h *****

class gxtkSurface;

class gxtkGraphics : public Object{
public:

	enum{
		MAX_VERTS=1024,
		MAX_QUADS=(MAX_VERTS/4)
	};

	int width;
	int height;

	int colorARGB;
	float r,g,b,alpha;
	float ix,iy,jx,jy,tx,ty;
	bool tformed;

	float vertices[MAX_VERTS*5];
	unsigned short quadIndices[MAX_QUADS*6];

	int primType;
	int vertCount;
	gxtkSurface *primSurf;
	
	gxtkGraphics();
	
	void Flush();
	float *Begin( int type,int count,gxtkSurface *surf );
	
	//***** GXTK API *****
	virtual int Width();
	virtual int Height();
	
	virtual int  BeginRender();
	virtual void EndRender();
	virtual void DiscardGraphics();

	virtual gxtkSurface *LoadSurface( String path );
	virtual gxtkSurface *LoadSurface__UNSAFE__( gxtkSurface *surface,String path );
	virtual gxtkSurface *CreateSurface( int width,int height );
	
	virtual int Cls( float r,float g,float b );
	virtual int SetAlpha( float alpha );
	virtual int SetColor( float r,float g,float b );
	virtual int SetBlend( int blend );
	virtual int SetScissor( int x,int y,int w,int h );
	virtual int SetMatrix( float ix,float iy,float jx,float jy,float tx,float ty );
	
	virtual int DrawPoint( float x,float y );
	virtual int DrawRect( float x,float y,float w,float h );
	virtual int DrawLine( float x1,float y1,float x2,float y2 );
	virtual int DrawOval( float x1,float y1,float x2,float y2 );
	virtual int DrawPoly( Array<Float> verts );
	virtual int DrawPoly2( Array<Float> verts,gxtkSurface *surface,int srcx,int srcy );
	virtual int DrawSurface( gxtkSurface *surface,float x,float y );
	virtual int DrawSurface2( gxtkSurface *surface,float x,float y,int srcx,int srcy,int srcw,int srch );
	
	virtual int ReadPixels( Array<int> pixels,int x,int y,int width,int height,int offset,int pitch );
	virtual int WritePixels2( gxtkSurface *surface,Array<int> pixels,int x,int y,int width,int height,int offset,int pitch );
};

class gxtkSurface : public Object{
public:
	unsigned char *data;
	int width;
	int height;
	int depth;
	int format;
	int seq;
	
	GLuint texture;
	float uscale;
	float vscale;
	
	gxtkSurface();
	
	void SetData( unsigned char *data,int width,int height,int depth );
	void SetSubData( int x,int y,int w,int h,unsigned *src,int pitch );
	void Bind();
	
	~gxtkSurface();
	
	//***** GXTK API *****
	virtual int Discard();
	virtual int Width();
	virtual int Height();
	virtual int Loaded();
	virtual bool OnUnsafeLoadComplete();
};

//***** gxtkGraphics.cpp *****

#ifndef GL_BGRA
#define GL_BGRA  0x80e1
#endif

#ifndef GL_CLAMP_TO_EDGE
#define GL_CLAMP_TO_EDGE 0x812f
#endif

#ifndef GL_GENERATE_MIPMAP
#define GL_GENERATE_MIPMAP 0x8191
#endif

static int Pow2Size( int n ){
	int i=1;
	while( i<n ) i+=i;
	return i;
}

gxtkGraphics::gxtkGraphics(){

	width=height=0;
#ifdef _glfw3_h_
	glfwGetWindowSize( BBGlfwGame::GlfwGame()->GetGLFWwindow(),&width,&height );
#else
	glfwGetWindowSize( &width,&height );
#endif
	
	if( CFG_OPENGL_GLES20_ENABLED ) return;
	
	for( int i=0;i<MAX_QUADS;++i ){
		quadIndices[i*6  ]=(short)(i*4);
		quadIndices[i*6+1]=(short)(i*4+1);
		quadIndices[i*6+2]=(short)(i*4+2);
		quadIndices[i*6+3]=(short)(i*4);
		quadIndices[i*6+4]=(short)(i*4+2);
		quadIndices[i*6+5]=(short)(i*4+3);
	}
}

void gxtkGraphics::Flush(){
	if( !vertCount ) return;

	if( primSurf ){
		glEnable( GL_TEXTURE_2D );
		primSurf->Bind();
	}
		
	switch( primType ){
	case 1:
		glDrawArrays( GL_POINTS,0,vertCount );
		break;
	case 2:
		glDrawArrays( GL_LINES,0,vertCount );
		break;
	case 3:
		glDrawArrays( GL_TRIANGLES,0,vertCount );
		break;
	case 4:
		glDrawElements( GL_TRIANGLES,vertCount/4*6,GL_UNSIGNED_SHORT,quadIndices );
		break;
	default:
		for( int j=0;j<vertCount;j+=primType ){
			glDrawArrays( GL_TRIANGLE_FAN,j,primType );
		}
		break;
	}

	if( primSurf ){
		glDisable( GL_TEXTURE_2D );
	}

	vertCount=0;
}

float *gxtkGraphics::Begin( int type,int count,gxtkSurface *surf ){
	if( primType!=type || primSurf!=surf || vertCount+count>MAX_VERTS ){
		Flush();
		primType=type;
		primSurf=surf;
	}
	float *vp=vertices+vertCount*5;
	vertCount+=count;
	return vp;
}

//***** GXTK API *****

int gxtkGraphics::Width(){
	return width;
}

int gxtkGraphics::Height(){
	return height;
}

int gxtkGraphics::BeginRender(){

	width=height=0;
#ifdef _glfw3_h_
	glfwGetWindowSize( BBGlfwGame::GlfwGame()->GetGLFWwindow(),&width,&height );
#else
	glfwGetWindowSize( &width,&height );
#endif
	
	if( CFG_OPENGL_GLES20_ENABLED ) return 0;
	
	glViewport( 0,0,width,height );

	glMatrixMode( GL_PROJECTION );
	glLoadIdentity();
	glOrtho( 0,width,height,0,-1,1 );
	glMatrixMode( GL_MODELVIEW );
	glLoadIdentity();
	
	glEnableClientState( GL_VERTEX_ARRAY );
	glVertexPointer( 2,GL_FLOAT,20,&vertices[0] );	
	
	glEnableClientState( GL_TEXTURE_COORD_ARRAY );
	glTexCoordPointer( 2,GL_FLOAT,20,&vertices[2] );
	
	glEnableClientState( GL_COLOR_ARRAY );
	glColorPointer( 4,GL_UNSIGNED_BYTE,20,&vertices[4] );
	
	glEnable( GL_BLEND );
	glBlendFunc( GL_ONE,GL_ONE_MINUS_SRC_ALPHA );
	
	glDisable( GL_TEXTURE_2D );
	
	vertCount=0;
	
	return 1;
}

void gxtkGraphics::EndRender(){
	if( !CFG_OPENGL_GLES20_ENABLED ) Flush();
#ifdef _glfw3_h_
	glfwSwapBuffers( BBGlfwGame::GlfwGame()->GetGLFWwindow() );
#else
	glfwSwapBuffers();
#endif

}

void gxtkGraphics::DiscardGraphics(){
}

int gxtkGraphics::Cls( float r,float g,float b ){
	vertCount=0;

	glClearColor( r/255.0f,g/255.0f,b/255.0f,1 );
	glClear( GL_COLOR_BUFFER_BIT );

	return 0;
}

int gxtkGraphics::SetAlpha( float alpha ){
	this->alpha=alpha;
	
	int a=int(alpha*255);
	
	colorARGB=(a<<24) | (int(b*alpha)<<16) | (int(g*alpha)<<8) | int(r*alpha);
	
	return 0;
}

int gxtkGraphics::SetColor( float r,float g,float b ){
	this->r=r;
	this->g=g;
	this->b=b;

	int a=int(alpha*255);
	
	colorARGB=(a<<24) | (int(b*alpha)<<16) | (int(g*alpha)<<8) | int(r*alpha);
	
	return 0;
}

int gxtkGraphics::SetBlend( int blend ){

	Flush();
	
	switch( blend ){
	case 1:
		glBlendFunc( GL_ONE,GL_ONE );
		break;
	default:
		glBlendFunc( GL_ONE,GL_ONE_MINUS_SRC_ALPHA );
	}

	return 0;
}

int gxtkGraphics::SetScissor( int x,int y,int w,int h ){

	Flush();
	
	if( x!=0 || y!=0 || w!=Width() || h!=Height() ){
		glEnable( GL_SCISSOR_TEST );
		y=Height()-y-h;
		glScissor( x,y,w,h );
	}else{
		glDisable( GL_SCISSOR_TEST );
	}
	return 0;
}

int gxtkGraphics::SetMatrix( float ix,float iy,float jx,float jy,float tx,float ty ){

	tformed=(ix!=1 || iy!=0 || jx!=0 || jy!=1 || tx!=0 || ty!=0);

	this->ix=ix;this->iy=iy;this->jx=jx;this->jy=jy;this->tx=tx;this->ty=ty;

	return 0;
}

int gxtkGraphics::DrawPoint( float x,float y ){

	if( tformed ){
		float px=x;
		x=px * ix + y * jx + tx;
		y=px * iy + y * jy + ty;
	}
	
	float *vp=Begin( 1,1,0 );
	
	vp[0]=x;vp[1]=y;(int&)vp[4]=colorARGB;

	return 0;	
}
	
int gxtkGraphics::DrawLine( float x0,float y0,float x1,float y1 ){

	if( tformed ){
		float tx0=x0,tx1=x1;
		x0=tx0 * ix + y0 * jx + tx;y0=tx0 * iy + y0 * jy + ty;
		x1=tx1 * ix + y1 * jx + tx;y1=tx1 * iy + y1 * jy + ty;
	}
	
	float *vp=Begin( 2,2,0 );

	vp[0]=x0;vp[1]=y0;(int&)vp[4]=colorARGB;
	vp[5]=x1;vp[6]=y1;(int&)vp[9]=colorARGB;
	
	return 0;
}

int gxtkGraphics::DrawRect( float x,float y,float w,float h ){

	float x0=x,x1=x+w,x2=x+w,x3=x;
	float y0=y,y1=y,y2=y+h,y3=y+h;

	if( tformed ){
		float tx0=x0,tx1=x1,tx2=x2,tx3=x3;
		x0=tx0 * ix + y0 * jx + tx;y0=tx0 * iy + y0 * jy + ty;
		x1=tx1 * ix + y1 * jx + tx;y1=tx1 * iy + y1 * jy + ty;
		x2=tx2 * ix + y2 * jx + tx;y2=tx2 * iy + y2 * jy + ty;
		x3=tx3 * ix + y3 * jx + tx;y3=tx3 * iy + y3 * jy + ty;
	}
	
	float *vp=Begin( 4,4,0 );

	vp[0 ]=x0;vp[1 ]=y0;(int&)vp[4 ]=colorARGB;
	vp[5 ]=x1;vp[6 ]=y1;(int&)vp[9 ]=colorARGB;
	vp[10]=x2;vp[11]=y2;(int&)vp[14]=colorARGB;
	vp[15]=x3;vp[16]=y3;(int&)vp[19]=colorARGB;

	return 0;
}

int gxtkGraphics::DrawOval( float x,float y,float w,float h ){
	
	float xr=w/2.0f;
	float yr=h/2.0f;

	int n;
	if( tformed ){
		float dx_x=xr * ix;
		float dx_y=xr * iy;
		float dx=sqrtf( dx_x*dx_x+dx_y*dx_y );
		float dy_x=yr * jx;
		float dy_y=yr * jy;
		float dy=sqrtf( dy_x*dy_x+dy_y*dy_y );
		n=(int)( dx+dy );
	}else{
		n=(int)( abs( xr )+abs( yr ) );
	}
	
	if( n<12 ){
		n=12;
	}else if( n>MAX_VERTS ){
		n=MAX_VERTS;
	}else{
		n&=~3;
	}

	float x0=x+xr,y0=y+yr;
	
	float *vp=Begin( n,n,0 );

	for( int i=0;i<n;++i ){
	
		float th=i * 6.28318531f / n;

		float px=x0+cosf( th ) * xr;
		float py=y0-sinf( th ) * yr;
		
		if( tformed ){
			float ppx=px;
			px=ppx * ix + py * jx + tx;
			py=ppx * iy + py * jy + ty;
		}
		
		vp[0]=px;vp[1]=py;(int&)vp[4]=colorARGB;
		vp+=5;
	}
	
	return 0;
}

int gxtkGraphics::DrawPoly( Array<Float> verts ){

	int n=verts.Length()/2;
	if( n<1 || n>MAX_VERTS ) return 0;
	
	float *vp=Begin( n,n,0 );
	
	for( int i=0;i<n;++i ){
		int j=i*2;
		if( tformed ){
			vp[0]=verts[j] * ix + verts[j+1] * jx + tx;
			vp[1]=verts[j] * iy + verts[j+1] * jy + ty;
		}else{
			vp[0]=verts[j];
			vp[1]=verts[j+1];
		}
		(int&)vp[4]=colorARGB;
		vp+=5;
	}

	return 0;
}

int gxtkGraphics::DrawPoly2( Array<Float> verts,gxtkSurface *surface,int srcx,int srcy ){

	int n=verts.Length()/4;
	if( n<1 || n>MAX_VERTS ) return 0;
		
	float *vp=Begin( n,n,surface );
	
	for( int i=0;i<n;++i ){
		int j=i*4;
		if( tformed ){
			vp[0]=verts[j] * ix + verts[j+1] * jx + tx;
			vp[1]=verts[j] * iy + verts[j+1] * jy + ty;
		}else{
			vp[0]=verts[j];
			vp[1]=verts[j+1];
		}
		vp[2]=(srcx+verts[j+2])*surface->uscale;
		vp[3]=(srcy+verts[j+3])*surface->vscale;
		(int&)vp[4]=colorARGB;
		vp+=5;
	}
	
	return 0;
}

int gxtkGraphics::DrawSurface( gxtkSurface *surf,float x,float y ){
	
	float w=surf->Width();
	float h=surf->Height();
	float x0=x,x1=x+w,x2=x+w,x3=x;
	float y0=y,y1=y,y2=y+h,y3=y+h;
	float u0=0,u1=w*surf->uscale;
	float v0=0,v1=h*surf->vscale;

	if( tformed ){
		float tx0=x0,tx1=x1,tx2=x2,tx3=x3;
		x0=tx0 * ix + y0 * jx + tx;y0=tx0 * iy + y0 * jy + ty;
		x1=tx1 * ix + y1 * jx + tx;y1=tx1 * iy + y1 * jy + ty;
		x2=tx2 * ix + y2 * jx + tx;y2=tx2 * iy + y2 * jy + ty;
		x3=tx3 * ix + y3 * jx + tx;y3=tx3 * iy + y3 * jy + ty;
	}
	
	float *vp=Begin( 4,4,surf );
	
	vp[0 ]=x0;vp[1 ]=y0;vp[2 ]=u0;vp[3 ]=v0;(int&)vp[4 ]=colorARGB;
	vp[5 ]=x1;vp[6 ]=y1;vp[7 ]=u1;vp[8 ]=v0;(int&)vp[9 ]=colorARGB;
	vp[10]=x2;vp[11]=y2;vp[12]=u1;vp[13]=v1;(int&)vp[14]=colorARGB;
	vp[15]=x3;vp[16]=y3;vp[17]=u0;vp[18]=v1;(int&)vp[19]=colorARGB;
	
	return 0;
}

int gxtkGraphics::DrawSurface2( gxtkSurface *surf,float x,float y,int srcx,int srcy,int srcw,int srch ){
	
	float w=srcw;
	float h=srch;
	float x0=x,x1=x+w,x2=x+w,x3=x;
	float y0=y,y1=y,y2=y+h,y3=y+h;
	float u0=srcx*surf->uscale,u1=(srcx+srcw)*surf->uscale;
	float v0=srcy*surf->vscale,v1=(srcy+srch)*surf->vscale;

	if( tformed ){
		float tx0=x0,tx1=x1,tx2=x2,tx3=x3;
		x0=tx0 * ix + y0 * jx + tx;y0=tx0 * iy + y0 * jy + ty;
		x1=tx1 * ix + y1 * jx + tx;y1=tx1 * iy + y1 * jy + ty;
		x2=tx2 * ix + y2 * jx + tx;y2=tx2 * iy + y2 * jy + ty;
		x3=tx3 * ix + y3 * jx + tx;y3=tx3 * iy + y3 * jy + ty;
	}
	
	float *vp=Begin( 4,4,surf );
	
	vp[0 ]=x0;vp[1 ]=y0;vp[2 ]=u0;vp[3 ]=v0;(int&)vp[4 ]=colorARGB;
	vp[5 ]=x1;vp[6 ]=y1;vp[7 ]=u1;vp[8 ]=v0;(int&)vp[9 ]=colorARGB;
	vp[10]=x2;vp[11]=y2;vp[12]=u1;vp[13]=v1;(int&)vp[14]=colorARGB;
	vp[15]=x3;vp[16]=y3;vp[17]=u0;vp[18]=v1;(int&)vp[19]=colorARGB;
	
	return 0;
}
	
int gxtkGraphics::ReadPixels( Array<int> pixels,int x,int y,int width,int height,int offset,int pitch ){

	Flush();

	unsigned *p=(unsigned*)malloc(width*height*4);

	glReadPixels( x,this->height-y-height,width,height,GL_BGRA,GL_UNSIGNED_BYTE,p );
	
	for( int py=0;py<height;++py ){
		memcpy( &pixels[offset+py*pitch],&p[(height-py-1)*width],width*4 );
	}
	
	free( p );
	
	return 0;
}

int gxtkGraphics::WritePixels2( gxtkSurface *surface,Array<int> pixels,int x,int y,int width,int height,int offset,int pitch ){

	Flush();
	
	surface->SetSubData( x,y,width,height,(unsigned*)&pixels[offset],pitch );
	
	return 0;
}

//***** gxtkSurface *****

gxtkSurface::gxtkSurface():data(0),width(0),height(0),depth(0),format(0),seq(-1),texture(0),uscale(0),vscale(0){
}

gxtkSurface::~gxtkSurface(){
	Discard();
}

int gxtkSurface::Discard(){
	if( seq==glfwGraphicsSeq ){
		glDeleteTextures( 1,&texture );
		seq=-1;
	}
	if( data ){
		free( data );
		data=0;
	}
	return 0;
}

int gxtkSurface::Width(){
	return width;
}

int gxtkSurface::Height(){
	return height;
}

int gxtkSurface::Loaded(){
	return 1;
}

//Careful! Can't call any GL here as it may be executing off-thread.
//
void gxtkSurface::SetData( unsigned char *data,int width,int height,int depth ){

	this->data=data;
	this->width=width;
	this->height=height;
	this->depth=depth;
	
	unsigned char *p=data;
	int n=width*height;
	
	switch( depth ){
	case 1:
		format=GL_LUMINANCE;
		break;
	case 2:
		format=GL_LUMINANCE_ALPHA;
		if( data ){
			while( n-- ){	//premultiply alpha
				p[0]=p[0]*p[1]/255;
				p+=2;
			}
		}
		break;
	case 3:
		format=GL_RGB;
		break;
	case 4:
		format=GL_RGBA;
		if( data ){
			while( n-- ){	//premultiply alpha
				p[0]=p[0]*p[3]/255;
				p[1]=p[1]*p[3]/255;
				p[2]=p[2]*p[3]/255;
				p+=4;
			}
		}
		break;
	}
}

void gxtkSurface::SetSubData( int x,int y,int w,int h,unsigned *src,int pitch ){
	if( format!=GL_RGBA ) return;
	
	if( !data ) data=(unsigned char*)malloc( width*height*4 );
	
	unsigned *dst=(unsigned*)data+y*width+x;
	
	for( int py=0;py<h;++py ){
		unsigned *d=dst+py*width;
		unsigned *s=src+py*pitch;
		for( int px=0;px<w;++px ){
			unsigned p=*s++;
			unsigned a=p>>24;
			*d++=(a<<24) | ((p>>0&0xff)*a/255<<16) | ((p>>8&0xff)*a/255<<8) | ((p>>16&0xff)*a/255);
		}
	}
	
	if( seq==glfwGraphicsSeq ){
		glBindTexture( GL_TEXTURE_2D,texture );
		glPixelStorei( GL_UNPACK_ALIGNMENT,1 );
		if( width==pitch ){
			glTexSubImage2D( GL_TEXTURE_2D,0,x,y,w,h,format,GL_UNSIGNED_BYTE,dst );
		}else{
			for( int py=0;py<h;++py ){
				glTexSubImage2D( GL_TEXTURE_2D,0,x,y+py,w,1,format,GL_UNSIGNED_BYTE,dst+py*width );
			}
		}
	}
}

void gxtkSurface::Bind(){

	if( !glfwGraphicsSeq ) return;
	
	if( seq==glfwGraphicsSeq ){
		glBindTexture( GL_TEXTURE_2D,texture );
		return;
	}
	
	seq=glfwGraphicsSeq;
	
	glGenTextures( 1,&texture );
	glBindTexture( GL_TEXTURE_2D,texture );
	
	if( CFG_MOJO_IMAGE_FILTERING_ENABLED ){
		glTexParameteri( GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR );
		glTexParameteri( GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR );
	}else{
		glTexParameteri( GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_NEAREST );
		glTexParameteri( GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_NEAREST );
	}

	glTexParameteri( GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_CLAMP_TO_EDGE );
	glTexParameteri( GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_CLAMP_TO_EDGE );

	int texwidth=width;
	int texheight=height;
	
	glTexImage2D( GL_TEXTURE_2D,0,format,texwidth,texheight,0,format,GL_UNSIGNED_BYTE,0 );
	if( glGetError()!=GL_NO_ERROR ){
		texwidth=Pow2Size( width );
		texheight=Pow2Size( height );
		glTexImage2D( GL_TEXTURE_2D,0,format,texwidth,texheight,0,format,GL_UNSIGNED_BYTE,0 );
	}
	
	uscale=1.0/texwidth;
	vscale=1.0/texheight;
	
	if( data ){
		glPixelStorei( GL_UNPACK_ALIGNMENT,1 );
		glTexSubImage2D( GL_TEXTURE_2D,0,0,0,width,height,format,GL_UNSIGNED_BYTE,data );
	}
}

bool gxtkSurface::OnUnsafeLoadComplete(){
	Bind();
	return true;
}

gxtkSurface *gxtkGraphics::LoadSurface__UNSAFE__( gxtkSurface *surface,String path ){
	int width,height,depth;
	unsigned char *data=BBGlfwGame::GlfwGame()->LoadImageData( path,&width,&height,&depth );
	if( !data ) return 0;
	surface->SetData( data,width,height,depth );
	return surface;
}

gxtkSurface *gxtkGraphics::LoadSurface( String path ){
	gxtkSurface *surf=LoadSurface__UNSAFE__( new gxtkSurface(),path );
	if( !surf ) return 0;
	surf->Bind();
	return surf;
}

gxtkSurface *gxtkGraphics::CreateSurface( int width,int height ){
	gxtkSurface *surf=new gxtkSurface();
	surf->SetData( 0,width,height,4 );
	surf->Bind();
	return surf;
}

//***** gxtkAudio.h *****

class gxtkSample;

class gxtkChannel{
public:
	ALuint source;
	gxtkSample *sample;
	int flags;
	int state;
	
	int AL_Source();
};

class gxtkAudio : public Object{
public:
	ALCdevice *alcDevice;
	ALCcontext *alcContext;
	gxtkChannel channels[33];

	gxtkAudio();

	virtual void mark();

	//***** GXTK API *****
	virtual int Suspend();
	virtual int Resume();

	virtual gxtkSample *LoadSample__UNSAFE__( gxtkSample *sample,String path );
	virtual gxtkSample *LoadSample( String path );
	virtual int PlaySample( gxtkSample *sample,int channel,int flags );

	virtual int StopChannel( int channel );
	virtual int PauseChannel( int channel );
	virtual int ResumeChannel( int channel );
	virtual int ChannelState( int channel );
	virtual int SetVolume( int channel,float volume );
	virtual int SetPan( int channel,float pan );
	virtual int SetRate( int channel,float rate );
	
	virtual int PlayMusic( String path,int flags );
	virtual int StopMusic();
	virtual int PauseMusic();
	virtual int ResumeMusic();
	virtual int MusicState();
	virtual int SetMusicVolume( float volume );
};

class gxtkSample : public Object{
public:
	ALuint al_buffer;

	gxtkSample();
	gxtkSample( ALuint buf );
	~gxtkSample();
	
	void SetBuffer( ALuint buf );
	
	//***** GXTK API *****
	virtual int Discard();
};

//***** gxtkAudio.cpp *****

static std::vector<ALuint> discarded;

static void FlushDiscarded( gxtkAudio *audio ){

	if( !discarded.size() ) return;
	
	for( int i=0;i<33;++i ){
		gxtkChannel *chan=&audio->channels[i];
		if( chan->state ){
			int state=0;
			alGetSourcei( chan->source,AL_SOURCE_STATE,&state );
			if( state==AL_STOPPED ) alSourcei( chan->source,AL_BUFFER,0 );
		}
	}
	
	std::vector<ALuint> out;
	
	for( int i=0;i<discarded.size();++i ){
		ALuint buf=discarded[i];
		alDeleteBuffers( 1,&buf );
		ALenum err=alGetError();
		if( err==AL_NO_ERROR ){
//			printf( "alDeleteBuffers OK!\n" );fflush( stdout );
		}else{
//			printf( "alDeleteBuffers failed...\n" );fflush( stdout );
			out.push_back( buf );
		}
	}
	discarded=out;
}

int gxtkChannel::AL_Source(){
	if( !source ) alGenSources( 1,&source );
	return source;
}

gxtkAudio::gxtkAudio(){

	if( alcDevice=alcOpenDevice( 0 ) ){
		if( alcContext=alcCreateContext( alcDevice,0 ) ){
			if( alcMakeContextCurrent( alcContext ) ){
				//alc all go!
			}else{
				bbPrint( "OpenAl error: alcMakeContextCurrent failed" );
			}
		}else{
			bbPrint( "OpenAl error: alcCreateContext failed" );
		}
	}else{
		bbPrint( "OpenAl error: alcOpenDevice failed" );
	}

	alDistanceModel( AL_NONE );
	
	memset( channels,0,sizeof(channels) );
}

void gxtkAudio::mark(){
	for( int i=0;i<33;++i ){
		gxtkChannel *chan=&channels[i];
		if( chan->state!=0 ){
			int state=0;
			alGetSourcei( chan->source,AL_SOURCE_STATE,&state );
			if( state!=AL_STOPPED ) gc_mark( chan->sample );
		}
	}
}

int gxtkAudio::Suspend(){
	for( int i=0;i<33;++i ){
		gxtkChannel *chan=&channels[i];
		if( chan->state==1 ){
			int state=0;
			alGetSourcei( chan->source,AL_SOURCE_STATE,&state );
			if( state==AL_PLAYING ) alSourcePause( chan->source );
		}
	}
	return 0;
}

int gxtkAudio::Resume(){
	for( int i=0;i<33;++i ){
		gxtkChannel *chan=&channels[i];
		if( chan->state==1 ){
			int state=0;
			alGetSourcei( chan->source,AL_SOURCE_STATE,&state );
			if( state==AL_PAUSED ) alSourcePlay( chan->source );
		}
	}
	return 0;
}

gxtkSample *gxtkAudio::LoadSample__UNSAFE__( gxtkSample *sample,String path ){

	int length=0;
	int channels=0;
	int format=0;
	int hertz=0;
	unsigned char *data=BBGlfwGame::GlfwGame()->LoadAudioData( path,&length,&channels,&format,&hertz );
	if( !data ) return 0;
	
	int al_format=0;
	if( format==1 && channels==1 ){
		al_format=AL_FORMAT_MONO8;
	}else if( format==1 && channels==2 ){
		al_format=AL_FORMAT_STEREO8;
	}else if( format==2 && channels==1 ){
		al_format=AL_FORMAT_MONO16;
	}else if( format==2 && channels==2 ){
		al_format=AL_FORMAT_STEREO16;
	}
	
	int size=length*channels*format;
	
	ALuint al_buffer;
	alGenBuffers( 1,&al_buffer );
	alBufferData( al_buffer,al_format,data,size,hertz );
	free( data );
	
	sample->SetBuffer( al_buffer );
	return sample;
}

gxtkSample *gxtkAudio::LoadSample( String path ){

	FlushDiscarded( this );

	return LoadSample__UNSAFE__( new gxtkSample(),path );
}

int gxtkAudio::PlaySample( gxtkSample *sample,int channel,int flags ){

	FlushDiscarded( this );
	
	gxtkChannel *chan=&channels[channel];
	
	chan->AL_Source();
	
	alSourceStop( chan->source );
	alSourcei( chan->source,AL_BUFFER,sample->al_buffer );
	alSourcei( chan->source,AL_LOOPING,flags ? 1 : 0 );
	alSourcePlay( chan->source );
	
	gc_assign( chan->sample,sample );

	chan->flags=flags;
	chan->state=1;

	return 0;
}

int gxtkAudio::StopChannel( int channel ){
	gxtkChannel *chan=&channels[channel];

	if( chan->state!=0 ){
		alSourceStop( chan->source );
		chan->state=0;
	}
	return 0;
}

int gxtkAudio::PauseChannel( int channel ){
	gxtkChannel *chan=&channels[channel];

	if( chan->state==1 ){
		int state=0;
		alGetSourcei( chan->source,AL_SOURCE_STATE,&state );
		if( state==AL_STOPPED ){
			chan->state=0;
		}else{
			alSourcePause( chan->source );
			chan->state=2;
		}
	}
	return 0;
}

int gxtkAudio::ResumeChannel( int channel ){
	gxtkChannel *chan=&channels[channel];

	if( chan->state==2 ){
		alSourcePlay( chan->source );
		chan->state=1;
	}
	return 0;
}

int gxtkAudio::ChannelState( int channel ){
	gxtkChannel *chan=&channels[channel];
	
	if( chan->state==1 ){
		int state=0;
		alGetSourcei( chan->source,AL_SOURCE_STATE,&state );
		if( state==AL_STOPPED ) chan->state=0;
	}
	return chan->state;
}

int gxtkAudio::SetVolume( int channel,float volume ){
	gxtkChannel *chan=&channels[channel];

	alSourcef( chan->AL_Source(),AL_GAIN,volume );
	return 0;
}

int gxtkAudio::SetPan( int channel,float pan ){
	gxtkChannel *chan=&channels[channel];
	
	float x=sinf( pan ),y=0,z=-cosf( pan );
	alSource3f( chan->AL_Source(),AL_POSITION,x,y,z );
	return 0;
}

int gxtkAudio::SetRate( int channel,float rate ){
	gxtkChannel *chan=&channels[channel];

	alSourcef( chan->AL_Source(),AL_PITCH,rate );
	return 0;
}

int gxtkAudio::PlayMusic( String path,int flags ){
	StopMusic();
	
	gxtkSample *music=LoadSample( path );
	if( !music ) return -1;
	
	PlaySample( music,32,flags );
	return 0;
}

int gxtkAudio::StopMusic(){
	StopChannel( 32 );
	return 0;
}

int gxtkAudio::PauseMusic(){
	PauseChannel( 32 );
	return 0;
}

int gxtkAudio::ResumeMusic(){
	ResumeChannel( 32 );
	return 0;
}

int gxtkAudio::MusicState(){
	return ChannelState( 32 );
}

int gxtkAudio::SetMusicVolume( float volume ){
	SetVolume( 32,volume );
	return 0;
}

gxtkSample::gxtkSample():
al_buffer(0){
}

gxtkSample::gxtkSample( ALuint buf ):
al_buffer(buf){
}

gxtkSample::~gxtkSample(){
	puts( "Discarding sample" );
	Discard();
}

void gxtkSample::SetBuffer( ALuint buf ){
	al_buffer=buf;
}

int gxtkSample::Discard(){
	if( al_buffer ){
		discarded.push_back( al_buffer );
		al_buffer=0;
	}
	return 0;
}


// ***** thread.h *****

#if __cplusplus_winrt

using namespace Windows::System::Threading;

#endif

class BBThread : public Object{
public:
	Object *result;
	
	BBThread();
	~BBThread();
	
	virtual void Start();
	virtual bool IsRunning();
	virtual Object *Result();
	virtual void SetResult( Object *result );
	
	virtual void Run__UNSAFE__();
	
	virtual void Wait();
	
private:

	enum{
		INIT=0,
		RUNNING=1,
		FINISHED=2
	};

	
	int _state;
	Object *_result;
	
#if __cplusplus_winrt

	friend class Launcher;

	class Launcher{
	
		friend class BBThread;
		BBThread *_thread;
		
		Launcher( BBThread *thread ):_thread(thread){
		}
		
		public:
		void operator()( IAsyncAction ^operation ){
			_thread->Run__UNSAFE__();
			_thread->_state=FINISHED;
		} 
	};

#elif _WIN32

	DWORD _id;
	HANDLE _handle;
	
	static DWORD WINAPI run( void *p );
	
#else

	pthread_t _handle;
	
	static void *run( void *p );
	
#endif

};

// ***** thread.cpp *****

BBThread::BBThread():_result( 0 ),_state( INIT ){
}

BBThread::~BBThread(){
	Wait();
}

bool BBThread::IsRunning(){
	return _state==RUNNING;
}

void BBThread::SetResult( Object *result ){
	_result=result;
}

Object *BBThread::Result(){
	return _result;
}

void BBThread::Run__UNSAFE__(){
}

#if __cplusplus_winrt

void BBThread::Start(){
	if( _state==RUNNING ) return;
	
	if( _state==FINISHED ) {}

	_result=0;
	
	_state=RUNNING;
	
	Launcher launcher( this );
	
	auto handler=ref new WorkItemHandler( launcher );
	
	ThreadPool::RunAsync( handler );
}

void BBThread::Wait(){
//	exit( -1 );
}

#elif _WIN32

void BBThread::Start(){
	if( _state==RUNNING ) return;
	
	if( _state==FINISHED ) CloseHandle( _handle );

	_state=RUNNING;

	_handle=CreateThread( 0,0,run,this,0,&_id );
	
//	_handle=CreateThread( 0,0,run,this,CREATE_SUSPENDED,&_id );
//	SetThreadPriority( _handle,THREAD_PRIORITY_ABOVE_NORMAL );
//	ResumeThread( _handle );
}

void BBThread::Wait(){
	if( _state==INIT ) return;

	WaitForSingleObject( _handle,INFINITE );
	CloseHandle( _handle );

	_state=INIT;
}

DWORD WINAPI BBThread::run( void *p ){
	BBThread *thread=(BBThread*)p;

	thread->Run__UNSAFE__();
	
	thread->_state=FINISHED;
	return 0;
}

#else

void BBThread::Start(){
	if( _state==RUNNING ) return;
	
	if( _state==FINISHED ) pthread_join( _handle,0 );

	_result=0;
		
	_state=RUNNING;
	
	pthread_create( &_handle,0,run,this );
}

void BBThread::Wait(){
	if( _state==INIT ) return;
	
	pthread_join( _handle,0 );
	
	_state=INIT;
}

void *BBThread::run( void *p ){
	BBThread *thread=(BBThread*)p;

	thread->Run__UNSAFE__();

	thread->_state=FINISHED;
	return 0;
}

#endif

/*
Copyright (c) 2011 Steve Revill and Shane Woolcock
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
#include <windows.h>
#include <string.h>
#include <iostream>

#include <time.h>
#include <Shellapi.h>
extern gxtkAudio *bb_audio_device;
extern gxtkGraphics *bb_graphics_device;

float diddy_mouseWheel = 0.0f;



float diddy_mouseZ() {
	float ret = glfwGetMouseWheel() - diddy_mouseWheel;
	diddy_mouseWheel = glfwGetMouseWheel();
	return ret;
}

class diddy
{
	public:
	
	// Returns an empty string if dialog is cancelled
	static String openfilename() {
		char *filter = "All Files (*.*)\0*.*\0";
		HWND owner = NULL;
		OPENFILENAME ofn;
		char fileName[MAX_PATH] = "";
		ZeroMemory(&ofn, sizeof(ofn));

		ofn.lStructSize = sizeof(OPENFILENAME);
		ofn.hwndOwner = owner;
		ofn.lpstrFilter = filter;
		ofn.lpstrFile = fileName;
		ofn.nMaxFile = MAX_PATH;
		ofn.Flags = OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_HIDEREADONLY;
		ofn.lpstrDefExt = "";

		String fileNameStr;

		if ( GetOpenFileName(&ofn) )
			fileNameStr = fileName;

		return fileNameStr;
	}
	
	static String savefilename() {
		char *filter = "All Files (*.*)\0*.*\0";
		HWND owner = NULL;
		OPENFILENAME ofn;
		char fileName[MAX_PATH] = "";
		ZeroMemory(&ofn, sizeof(ofn));

		ofn.lStructSize = sizeof(OPENFILENAME);
		ofn.hwndOwner = owner;
		ofn.lpstrFilter = filter;
		ofn.lpstrFile = fileName;
		ofn.nMaxFile = MAX_PATH;
		ofn.Flags = OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_HIDEREADONLY;
		ofn.lpstrDefExt = "";

		String fileNameStr;

		if ( GetSaveFileNameA(&ofn) )
			fileNameStr = fileName;

		return fileNameStr;
	}
	
	static float mouseZ()
	{
		return diddy_mouseZ();
	}
	
	static void mouseZInit()
	{
		return;
	}
	
	// only accurate to 1 second 
	static int systemMillisecs() {
		time_t seconds;
		seconds = time (NULL);
		return seconds * 1000;
	}
	
	static void setGraphics(int w, int h)
	{
		glfwSetWindowSize(w, h);
		GLFWvidmode desktopMode;
		glfwGetDesktopMode( &desktopMode );
		glfwSetWindowPos( (desktopMode.Width-w)/2,(desktopMode.Height-h)/2 );
	}
	
	static void setMouse(int x, int y)
	{
		glfwSetMousePos(x, y);
	}
	
	static void showKeyboard()
	{
	}
	static void launchBrowser(String address, String windowName)
	{
		LPCSTR addressStr = address.ToCString<char>();
		ShellExecute(HWND_DESKTOP, "open", addressStr, NULL, NULL, SW_SHOWNORMAL);
	}
	static void launchEmail(String email, String subject, String text)
	{
		String tmp = "mailto:";
		tmp+=email;
		tmp+="&subject=";
		tmp+=subject;
		tmp+="&body=";
		tmp+=text;
		LPCSTR addressStr = tmp.ToCString<char>();
		ShellExecute(HWND_DESKTOP, "open", addressStr, NULL, NULL, SW_SHOWNORMAL);
	}

	static void startVibrate(int millisecs)
	{
	}
	static void stopVibrate()
	{
	}
	
	static int getDayOfMonth()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wDay;
	}
	
	static int getDayOfWeek()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wDayOfWeek;
	}
	
	static int getMonth()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wMonth;
	}
	
	static int getYear()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wYear;
	}
	
	static int getHours()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wHour;
	}
	
	static int getMinutes()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wMinute;
	}
	
	static int getSeconds()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wSecond;
	}
	
	static int getMilliSeconds()
	{
		SYSTEMTIME st;
		GetSystemTime(&st);
		return st.wMilliseconds;
	}
	
	static void startGps()
	{
	}
	static String getLatitiude()
	{
		return "";
	}
	static String getLongitude()
	{
		return "";
	}
	static void showAlertDialog(String title, String message)
	{
	}
	static String getInputString()
	{
		return "";
	}

	static int seekMusic(int timeMillis)
	{
		gxtkChannel *chan = &(bb_audio_device->channels[32]);
		if(chan && chan->state==1)
		{
			alSourcef(chan->source, AL_SEC_OFFSET, (float)(timeMillis / 1000.0));
		}
		// TODO: check it worked
		return 1;
	}
};

class c_DiddyException;
class c_ClassInfo;
class c_Map;
class c_StringMap;
class c_Node;
class c__GetClass;
class c_AssertException;
class c_ConcurrentModificationException;
class c_IndexOutOfBoundsException;
class c_IllegalArgumentException;
class c_XMLParseException;
class c_BoolObject;
class c_IntObject;
class c_FloatObject;
class c_StringObject;
class c_R16;
class c_R17;
class c_R18;
class c_R31;
class c_R33;
class c_R35;
class c_R37;
class c_R39;
class c_R41;
class c_R47;
class c_R57;
class c_R67;
class c_FunctionInfo;
class c_R4;
class c_R5;
class c_R6;
class c_R7;
class c_R8;
class c_R9;
class c_R10;
class c_R11;
class c_R12;
class c_R13;
class c_R14;
class c_R15;
class c___GetClass;
class c_App;
class c_DiddyApp;
class c_Game;
class c_GameDelegate;
class c_Screen;
class c_Map2;
class c_StringMap2;
class c_Screens;
class c_ExitScreen;
class c_LoadingScreen;
class c_LoadingBar;
class c_ScreenFade;
class c_GameImage;
class c_Map3;
class c_StringMap3;
class c_ImageBank;
class c_GameSound;
class c_Map4;
class c_StringMap4;
class c_SoundBank;
class c_InputCache;
class c_InputEventEnumerator;
class c_KeyEventEnumerator;
class c_InputEvent;
class c_KeyEvent;
class c_EnumWrapper;
class c_TouchData;
class c_DiddyMouse;
class c_ConstInfo;
class c_Stack;
class c_FieldInfo;
class c_Stack2;
class c_GlobalInfo;
class c_Stack3;
class c_MethodInfo;
class c_Stack4;
class c_Stack5;
class c_R19;
class c_R20;
class c_R21;
class c_R22;
class c_R23;
class c_R24;
class c_R25;
class c_R26;
class c_R27;
class c_R28;
class c_R30;
class c_R29;
class c_R32;
class c_R34;
class c_R36;
class c_R38;
class c_R40;
class c_R42;
class c_R44;
class c_R45;
class c_R43;
class c_R46;
class c_R48;
class c_R51;
class c_R52;
class c_R53;
class c_R54;
class c_R55;
class c_R49;
class c_R50;
class c_R56;
class c_R58;
class c_R61;
class c_R62;
class c_R63;
class c_R64;
class c_R65;
class c_R59;
class c_R60;
class c_R66;
class c_R68;
class c_R72;
class c_R73;
class c_R74;
class c_R69;
class c_R70;
class c_R71;
class c_R75;
class c_UnknownClass;
class c_Image;
class c_GraphicsContext;
class c_Frame;
class c_InputDevice;
class c_JoyState;
class c_BBGameEvent;
class c_DeltaTimer;
class c_Sprite;
class c_Particle;
class c_HitBox;
class c_FPSCounter;
class c_IComparable;
class c_DiddyDataLayer;
class c_ICollection;
class c_IList;
class c_ArrayList;
class c_DiddyDataLayers;
class c_IEnumerator;
class c_DiddyDataObject;
class c_ICollection2;
class c_IList2;
class c_ArrayList2;
class c_DiddyDataObjects;
class c_IEnumerator2;
class c_MapKeys;
class c_KeyEnumerator;
class c_Node2;
class c_SoundPlayer;
class c_Node3;
class c_MapKeys2;
class c_KeyEnumerator2;
class c_Node4;
class c_Sound;
class c_MapKeys3;
class c_KeyEnumerator3;
class c_XMLParser;
class c_XMLDocument;
class c_XMLElement;
class c_ICollection3;
class c_IList3;
class c_ArrayList3;
class c_XMLAttribute;
class c_ICollection4;
class c_IList4;
class c_ArrayList4;
class c_IEnumerator3;
class c_IEnumerator4;
class c_JsonValue;
class c_JsonObject;
class c_Map5;
class c_StringMap5;
class c_JsonParser;
class c_JsonError;
class c_Stack6;
class c_StringStack;
class c_JsonString;
class c_JsonNumber;
class c_JsonArray;
class c_Stack7;
class c_JsonBool;
class c_JsonNull;
class c_Node5;
class c_NodeEnumerator;
class c_TitleScreen;
class c_GameScreen;
class c_ListEnumerator;
class c_ArrayListEnumerator;
class c_ListEnumerator2;
class c_ArrayListEnumerator2;
class c_ListEnumerator3;
class c_ArrayListEnumerator3;
class c_ListEnumerator4;
class c_ArrayListEnumerator4;
class c_TileMapReader;
class c_TiledTileMapReader;
class c_MyTiledTileMapReader;
class c_TileMapPropertyContainer;
class c_ITileMapPostLoad;
class c_TileMap;
class c_TileMapProperty;
class c_TileMapProperties;
class c_Map6;
class c_StringMap6;
class c_Node6;
class c_TileMapTileset;
class c_TileMapImage;
class c_TileMapTile;
class c_ICollection5;
class c_IList5;
class c_ArrayList5;
class c_Map7;
class c_StringMap7;
class c_Node7;
class c_TileMapLayer;
class c_TileMapTileLayer;
class c_TileMapData;
class c_TileMapCell;
class c_ICollection6;
class c_IList6;
class c_ArrayList6;
class c_TileMapObjectLayer;
class c_TileMapObject;
class c_ICollection7;
class c_IList7;
class c_ArrayList7;
class c_MyTileMap;
class c_Bunny;
class c_Bullet;
class c_List;
class c_Node8;
class c_HeadNode;
class c_Hunter;
class c_List2;
class c_Node9;
class c_HeadNode2;
class c_Enumerator;
class c_Enumerator2;
class c_IEnumerator5;
class c_MapValues;
class c_ValueEnumerator;
class c_IEnumerator6;
class c_ListEnumerator5;
class c_ArrayListEnumerator5;
class c_ListEnumerator6;
class c_ArrayListEnumerator6;
class c_DiddyException : public ThrowableObject{
	public:
	String m_message;
	ThrowableObject* m_cause;
	String m_type;
	String m_fullType;
	c_DiddyException();
	String p_Message();
	void p_Message2(String);
	ThrowableObject* p_Cause();
	void p_Cause2(ThrowableObject*);
	String p_Type();
	String p_FullType();
	String p_ToString(bool);
	c_DiddyException* m_new(String,ThrowableObject*);
	void mark();
	String debug();
};
String dbg_type(c_DiddyException**p){return "DiddyException";}
class c_ClassInfo : public Object{
	public:
	String m__name;
	int m__attrs;
	c_ClassInfo* m__sclass;
	Array<c_ClassInfo* > m__ifaces;
	Array<c_ConstInfo* > m__rconsts;
	Array<c_ConstInfo* > m__consts;
	Array<c_FieldInfo* > m__rfields;
	Array<c_FieldInfo* > m__fields;
	Array<c_GlobalInfo* > m__rglobals;
	Array<c_GlobalInfo* > m__globals;
	Array<c_MethodInfo* > m__rmethods;
	Array<c_MethodInfo* > m__methods;
	Array<c_FunctionInfo* > m__rfunctions;
	Array<c_FunctionInfo* > m__functions;
	Array<c_FunctionInfo* > m__ctors;
	c_ClassInfo();
	String p_Name();
	c_ClassInfo* m_new(String,int,c_ClassInfo*,Array<c_ClassInfo* >);
	c_ClassInfo* m_new2();
	virtual int p_Init();
	int p_InitR();
	void mark();
	String debug();
};
String dbg_type(c_ClassInfo**p){return "ClassInfo";}
class c_Map : public Object{
	public:
	c_Node* m_root;
	c_Map();
	c_Map* m_new();
	virtual int p_Compare(String,String)=0;
	int p_RotateLeft(c_Node*);
	int p_RotateRight(c_Node*);
	int p_InsertFixup(c_Node*);
	bool p_Set(String,c_ClassInfo*);
	c_Node* p_FindNode(String);
	bool p_Contains(String);
	c_ClassInfo* p_Get(String);
	void mark();
	String debug();
};
String dbg_type(c_Map**p){return "Map";}
class c_StringMap : public c_Map{
	public:
	c_StringMap();
	c_StringMap* m_new();
	int p_Compare(String,String);
	void mark();
	String debug();
};
String dbg_type(c_StringMap**p){return "StringMap";}
extern c_StringMap* bb_reflection__classesMap;
extern Array<c_ClassInfo* > bb_reflection__classes;
class c_Node : public Object{
	public:
	String m_key;
	c_Node* m_right;
	c_Node* m_left;
	c_ClassInfo* m_value;
	int m_color;
	c_Node* m_parent;
	c_Node();
	c_Node* m_new(String,c_ClassInfo*,int,c_Node*);
	c_Node* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_Node**p){return "Node";}
c_ClassInfo* bb_reflection_GetClass(String);
class c__GetClass : public Object{
	public:
	c__GetClass();
	virtual c_ClassInfo* p_GetClass(Object*)=0;
	c__GetClass* m_new();
	void mark();
	String debug();
};
String dbg_type(c__GetClass**p){return "_GetClass";}
extern c__GetClass* bb_reflection__getClass;
c_ClassInfo* bb_reflection_GetClass2(Object*);
class c_AssertException : public c_DiddyException{
	public:
	c_AssertException();
	c_AssertException* m_new(String,ThrowableObject*);
	void mark();
	String debug();
};
String dbg_type(c_AssertException**p){return "AssertException";}
class c_ConcurrentModificationException : public c_DiddyException{
	public:
	c_ConcurrentModificationException();
	c_ConcurrentModificationException* m_new(String,ThrowableObject*);
	void mark();
	String debug();
};
String dbg_type(c_ConcurrentModificationException**p){return "ConcurrentModificationException";}
class c_IndexOutOfBoundsException : public c_DiddyException{
	public:
	c_IndexOutOfBoundsException();
	c_IndexOutOfBoundsException* m_new(String,ThrowableObject*);
	void mark();
	String debug();
};
String dbg_type(c_IndexOutOfBoundsException**p){return "IndexOutOfBoundsException";}
class c_IllegalArgumentException : public c_DiddyException{
	public:
	c_IllegalArgumentException();
	c_IllegalArgumentException* m_new(String,ThrowableObject*);
	void mark();
	String debug();
};
String dbg_type(c_IllegalArgumentException**p){return "IllegalArgumentException";}
class c_XMLParseException : public c_DiddyException{
	public:
	c_XMLParseException();
	c_XMLParseException* m_new(String,ThrowableObject*);
	void mark();
	String debug();
};
String dbg_type(c_XMLParseException**p){return "XMLParseException";}
class c_BoolObject : public Object{
	public:
	bool m_value;
	c_BoolObject();
	c_BoolObject* m_new(bool);
	bool p_ToBool();
	bool p_Equals(c_BoolObject*);
	c_BoolObject* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_BoolObject**p){return "BoolObject";}
class c_IntObject : public Object{
	public:
	int m_value;
	c_IntObject();
	c_IntObject* m_new(int);
	c_IntObject* m_new2(Float);
	int p_ToInt();
	Float p_ToFloat();
	String p_ToString2();
	bool p_Equals2(c_IntObject*);
	int p_Compare2(c_IntObject*);
	c_IntObject* m_new3();
	void mark();
	String debug();
};
String dbg_type(c_IntObject**p){return "IntObject";}
class c_FloatObject : public Object{
	public:
	Float m_value;
	c_FloatObject();
	c_FloatObject* m_new(int);
	c_FloatObject* m_new2(Float);
	int p_ToInt();
	Float p_ToFloat();
	String p_ToString2();
	bool p_Equals3(c_FloatObject*);
	int p_Compare3(c_FloatObject*);
	c_FloatObject* m_new3();
	void mark();
	String debug();
};
String dbg_type(c_FloatObject**p){return "FloatObject";}
class c_StringObject : public Object{
	public:
	String m_value;
	c_StringObject();
	c_StringObject* m_new(int);
	c_StringObject* m_new2(Float);
	c_StringObject* m_new3(String);
	String p_ToString2();
	bool p_Equals4(c_StringObject*);
	int p_Compare4(c_StringObject*);
	c_StringObject* m_new4();
	void mark();
	String debug();
};
String dbg_type(c_StringObject**p){return "StringObject";}
Object* bb_boxes_BoxBool(bool);
Object* bb_boxes_BoxInt(int);
Object* bb_boxes_BoxFloat(Float);
Object* bb_boxes_BoxString(String);
bool bb_boxes_UnboxBool(Object*);
int bb_boxes_UnboxInt(Object*);
Float bb_boxes_UnboxFloat(Object*);
String bb_boxes_UnboxString(Object*);
class c_R16 : public c_ClassInfo{
	public:
	c_R16();
	c_R16* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R16**p){return "R16";}
class c_R17 : public c_ClassInfo{
	public:
	c_R17();
	c_R17* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R17**p){return "R17";}
class c_R18 : public c_ClassInfo{
	public:
	c_R18();
	c_R18* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R18**p){return "R18";}
class c_R31 : public c_ClassInfo{
	public:
	c_R31();
	c_R31* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R31**p){return "R31";}
class c_R33 : public c_ClassInfo{
	public:
	c_R33();
	c_R33* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R33**p){return "R33";}
class c_R35 : public c_ClassInfo{
	public:
	c_R35();
	c_R35* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R35**p){return "R35";}
class c_R37 : public c_ClassInfo{
	public:
	c_R37();
	c_R37* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R37**p){return "R37";}
class c_R39 : public c_ClassInfo{
	public:
	c_R39();
	c_R39* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R39**p){return "R39";}
class c_R41 : public c_ClassInfo{
	public:
	c_R41();
	c_R41* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R41**p){return "R41";}
extern c_ClassInfo* bb_reflection__boolClass;
class c_R47 : public c_ClassInfo{
	public:
	c_R47();
	c_R47* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R47**p){return "R47";}
extern c_ClassInfo* bb_reflection__intClass;
class c_R57 : public c_ClassInfo{
	public:
	c_R57();
	c_R57* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R57**p){return "R57";}
extern c_ClassInfo* bb_reflection__floatClass;
class c_R67 : public c_ClassInfo{
	public:
	c_R67();
	c_R67* m_new();
	int p_Init();
	void mark();
	String debug();
};
String dbg_type(c_R67**p){return "R67";}
extern c_ClassInfo* bb_reflection__stringClass;
class c_FunctionInfo : public Object{
	public:
	String m__name;
	int m__attrs;
	c_ClassInfo* m__retType;
	Array<c_ClassInfo* > m__argTypes;
	c_FunctionInfo();
	c_FunctionInfo* m_new(String,int,c_ClassInfo*,Array<c_ClassInfo* >);
	c_FunctionInfo* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_FunctionInfo**p){return "FunctionInfo";}
extern Array<c_FunctionInfo* > bb_reflection__functions;
class c_R4 : public c_FunctionInfo{
	public:
	c_R4();
	c_R4* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R4**p){return "R4";}
class c_R5 : public c_FunctionInfo{
	public:
	c_R5();
	c_R5* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R5**p){return "R5";}
class c_R6 : public c_FunctionInfo{
	public:
	c_R6();
	c_R6* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R6**p){return "R6";}
class c_R7 : public c_FunctionInfo{
	public:
	c_R7();
	c_R7* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R7**p){return "R7";}
class c_R8 : public c_FunctionInfo{
	public:
	c_R8();
	c_R8* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R8**p){return "R8";}
class c_R9 : public c_FunctionInfo{
	public:
	c_R9();
	c_R9* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R9**p){return "R9";}
class c_R10 : public c_FunctionInfo{
	public:
	c_R10();
	c_R10* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R10**p){return "R10";}
class c_R11 : public c_FunctionInfo{
	public:
	c_R11();
	c_R11* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R11**p){return "R11";}
class c_R12 : public c_FunctionInfo{
	public:
	c_R12();
	c_R12* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R12**p){return "R12";}
class c_R13 : public c_FunctionInfo{
	public:
	c_R13();
	c_R13* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R13**p){return "R13";}
class c_R14 : public c_FunctionInfo{
	public:
	c_R14();
	c_R14* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R14**p){return "R14";}
class c_R15 : public c_FunctionInfo{
	public:
	c_R15();
	c_R15* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R15**p){return "R15";}
class c___GetClass : public c__GetClass{
	public:
	c___GetClass();
	c___GetClass* m_new();
	c_ClassInfo* p_GetClass(Object*);
	void mark();
	String debug();
};
String dbg_type(c___GetClass**p){return "__GetClass";}
int bb_reflection___init();
extern int bb_reflection__init;
class c_App : public Object{
	public:
	c_App();
	c_App* m_new();
	virtual int p_OnCreate();
	virtual int p_OnSuspend();
	virtual int p_OnResume();
	virtual int p_OnUpdate();
	int p_OnLoading();
	virtual int p_OnRender();
	int p_OnClose();
	virtual int p_OnBack();
	void mark();
	String debug();
};
String dbg_type(c_App**p){return "App";}
class c_DiddyApp : public c_App{
	public:
	c_Screens* m_screens;
	c_ExitScreen* m_exitScreen;
	c_LoadingScreen* m_loadingScreen;
	c_ScreenFade* m_screenFade;
	c_ImageBank* m_images;
	c_SoundBank* m_sounds;
	c_InputCache* m_inputCache;
	c_DiddyMouse* m_diddyMouse;
	bool m_virtualResOn;
	bool m_aspectRatioOn;
	Float m_aspectRatio;
	int m_deviceChanged;
	int m_mouseX;
	int m_mouseY;
	int m_FPS;
	bool m_useFixedRateLogic;
	Float m_frameRate;
	Float m_ms;
	Float m_numTicks;
	Float m_lastNumTicks;
	Float m_lastTime;
	Float m_multi;
	Float m_heightBorder;
	Float m_widthBorder;
	Float m_vsx;
	Float m_vsy;
	Float m_vsw;
	Float m_vsh;
	Float m_virtualScaledW;
	Float m_virtualScaledH;
	Float m_virtualXOff;
	Float m_virtualYOff;
	bool m_autoCls;
	c_Screen* m_currentScreen;
	bool m_debugOn;
	String m_musicFile;
	int m_musicOkay;
	int m_musicVolume;
	Float m_mojoMusicVolume;
	int m_soundVolume;
	bool m_drawFPSOn;
	int m_mouseHit;
	bool m_debugKeyOn;
	int m_debugKey;
	Float m_tmpMs;
	int m_maxMs;
	c_Screen* m_nextScreen;
	Float m_scrollX;
	Float m_scrollY;
	c_DiddyApp();
	c_DiddyApp* m_new();
	void p_SetScreenSize(Float,Float,bool);
	void p_ResetFixedRateLogic();
	void p_Create();
	int p_OnCreate();
	void p_DrawDebug();
	void p_DrawFPS();
	int p_OnRender();
	void p_ReadInputs();
	void p_OverrideUpdate();
	void p_SetMojoMusicVolume(Float);
	Float p_CalcAnimLength(int);
	void p_MusicPlay(String,int);
	void p_Update(Float);
	int p_OnUpdate();
	int p_OnSuspend();
	int p_OnResume();
	int p_OnBack();
	void mark();
	String debug();
};
String dbg_type(c_DiddyApp**p){return "DiddyApp";}
class c_Game : public c_DiddyApp{
	public:
	c_Game();
	c_Game* m_new();
	void p_LoadImages();
	int p_OnCreate();
	void mark();
	String debug();
};
String dbg_type(c_Game**p){return "Game";}
extern c_App* bb_app__app;
class c_GameDelegate : public BBGameDelegate{
	public:
	gxtkGraphics* m__graphics;
	gxtkAudio* m__audio;
	c_InputDevice* m__input;
	c_GameDelegate();
	c_GameDelegate* m_new();
	void StartGame();
	void SuspendGame();
	void ResumeGame();
	void UpdateGame();
	void RenderGame();
	void KeyEvent(int,int);
	void MouseEvent(int,int,Float,Float);
	void TouchEvent(int,int,Float,Float);
	void MotionEvent(int,int,Float,Float,Float);
	void DiscardGraphics();
	void mark();
	String debug();
};
String dbg_type(c_GameDelegate**p){return "GameDelegate";}
extern c_GameDelegate* bb_app__delegate;
extern BBGame* bb_app__game;
extern c_DiddyApp* bb_framework_diddyGame;
class c_Screen : public Object{
	public:
	String m_name;
	c_DiddyDataLayers* m_layers;
	String m_backScreenName;
	bool m_autoFadeIn;
	Float m_autoFadeInTime;
	bool m_autoFadeInSound;
	bool m_autoFadeInMusic;
	String m_musicPath;
	int m_musicFlag;
	c_Screen();
	c_Screen* m_new(String);
	void p_RenderBackgroundLayers();
	virtual void p_Render()=0;
	void p_RenderForegroundLayers();
	void p_ExtraRender();
	void p_DebugRender();
	void p_OnTouchHit(int,int,int);
	void p_OnTouchClick(int,int,int);
	void p_OnTouchFling(int,int,Float,Float,Float,int);
	void p_OnTouchReleased(int,int,int);
	void p_OnTouchDragged(int,int,int,int,int);
	void p_OnTouchLongPress(int,int,int);
	void p_OnAnyKeyHit();
	void p_OnKeyHit(int);
	void p_OnAnyKeyDown();
	void p_OnKeyDown(int);
	void p_OnAnyKeyReleased();
	void p_OnKeyReleased(int);
	void p_OnMouseHit(int,int,int);
	void p_OnMouseDown(int,int,int);
	void p_OnMouseReleased(int,int,int);
	void p_Kill();
	virtual void p_Start()=0;
	void p_PreStart();
	void p_PostFadeOut();
	void p_PostFadeIn();
	virtual void p_Update2()=0;
	void p_Suspend();
	void p_Resume();
	void p_FadeToScreen(c_Screen*,Float,bool,bool,bool);
	void p_Back();
	void mark();
	String debug();
};
String dbg_type(c_Screen**p){return "Screen";}
class c_Map2 : public Object{
	public:
	c_Node3* m_root;
	c_Map2();
	c_Map2* m_new();
	virtual int p_Compare(String,String)=0;
	int p_RotateLeft2(c_Node3*);
	int p_RotateRight2(c_Node3*);
	int p_InsertFixup2(c_Node3*);
	virtual bool p_Set2(String,c_Screen*);
	c_MapKeys3* p_Keys();
	c_Node3* p_FirstNode();
	c_Node3* p_FindNode(String);
	c_Screen* p_Get(String);
	void mark();
	String debug();
};
String dbg_type(c_Map2**p){return "Map";}
class c_StringMap2 : public c_Map2{
	public:
	c_StringMap2();
	c_StringMap2* m_new();
	int p_Compare(String,String);
	void mark();
	String debug();
};
String dbg_type(c_StringMap2**p){return "StringMap";}
class c_Screens : public c_StringMap2{
	public:
	c_Screens();
	c_Screens* m_new();
	bool p_Set2(String,c_Screen*);
	c_Screen* p_Find(String);
	void mark();
	String debug();
};
String dbg_type(c_Screens**p){return "Screens";}
class c_ExitScreen : public c_Screen{
	public:
	c_ExitScreen();
	c_ExitScreen* m_new();
	void p_Start();
	void p_Render();
	void p_Update2();
	void mark();
	String debug();
};
String dbg_type(c_ExitScreen**p){return "ExitScreen";}
class c_LoadingScreen : public c_Screen{
	public:
	c_LoadingBar* m_loadingBar;
	bool m_finished;
	c_Screen* m_destination;
	c_Image* m_image;
	c_LoadingScreen();
	c_LoadingScreen* m_new();
	void p_Start();
	void p_Render();
	void p_Update2();
	void mark();
	String debug();
};
String dbg_type(c_LoadingScreen**p){return "LoadingScreen";}
class c_LoadingBar : public Object{
	public:
	c_Image* m_emptyImage;
	int m_x;
	int m_y;
	c_Image* m_fullImage;
	Float m_position;
	int m_currentStep;
	Float m_stepSize;
	Float m_steps;
	bool m_finished;
	c_LoadingBar();
	c_LoadingBar* m_new();
	void p_Draw();
	void p_Progress();
	void mark();
	String debug();
};
String dbg_type(c_LoadingBar**p){return "LoadingBar";}
class c_ScreenFade : public Object{
	public:
	bool m_active;
	Float m_ratio;
	Float m_counter;
	Float m_fadeTime;
	bool m_fadeMusic;
	bool m_fadeOut;
	bool m_fadeSound;
	bool m_allowScreenUpdate;
	c_ScreenFade();
	c_ScreenFade* m_new();
	void p_Render();
	void p_CalcRatio();
	void p_Start2(Float,bool,bool,bool,bool);
	void p_Update2();
	void mark();
	String debug();
};
String dbg_type(c_ScreenFade**p){return "ScreenFade";}
class c_GameImage : public Object{
	public:
	c_Image* m_image;
	int m_w;
	int m_h;
	bool m_preLoad;
	String m_screenName;
	int m_frames;
	String m_path;
	bool m_midhandle;
	bool m_readPixels;
	int m_maskRed;
	int m_maskGreen;
	int m_maskBlue;
	String m_name;
	Float m_w2;
	Float m_h2;
	int m_midhandled;
	Array<int > m_pixels;
	String m_atlasName;
	int m_subX;
	int m_subY;
	int m_tileMargin;
	int m_tileWidth;
	int m_tileSpacing;
	int m_tileCountX;
	int m_tileHeight;
	int m_tileCountY;
	int m_tileCount;
	c_GameImage();
	void p_Draw2(Float,Float,Float,Float,Float,int);
	void p_CalcSize();
	void p_MidHandle(bool);
	bool p_MidHandle2();
	void p_SetMaskColor(int,int,int);
	void p_LoadAnim(String,int,int,int,c_Image*,bool,bool,int,int,int,bool,String);
	void p_Load(String,bool,bool,int,int,int,bool,String);
	c_GameImage* m_new();
	void p_DrawTile(Float,Float,int,Float,Float,Float);
	void p_LoadTileset(String,int,int,int,int,bool,bool,int,int,int);
	void mark();
	String debug();
};
String dbg_type(c_GameImage**p){return "GameImage";}
class c_Map3 : public Object{
	public:
	c_Node2* m_root;
	c_Map3();
	c_Map3* m_new();
	c_MapKeys* p_Keys();
	c_Node2* p_FirstNode();
	virtual int p_Compare(String,String)=0;
	c_Node2* p_FindNode(String);
	c_GameImage* p_Get(String);
	int p_RotateLeft3(c_Node2*);
	int p_RotateRight3(c_Node2*);
	int p_InsertFixup3(c_Node2*);
	bool p_Set3(String,c_GameImage*);
	bool p_Contains(String);
	void mark();
	String debug();
};
String dbg_type(c_Map3**p){return "Map";}
class c_StringMap3 : public c_Map3{
	public:
	c_StringMap3();
	c_StringMap3* m_new();
	int p_Compare(String,String);
	void mark();
	String debug();
};
String dbg_type(c_StringMap3**p){return "StringMap";}
class c_ImageBank : public c_StringMap3{
	public:
	String m_path;
	c_ImageBank();
	c_ImageBank* m_new();
	c_GameImage* p_Find(String);
	String p_LoadAtlasString(String);
	String p_SaveAtlasToBank(c_Image*,String);
	void p_LoadSparrowAtlas(String,bool,bool,int,int,int);
	void p_LoadLibGdxAtlas(String,bool,bool,int,int,int);
	void p_LoadJsonAtlas(String,bool,bool,int,int,int);
	void p_LoadAtlas(String,int,bool,bool,int,int,int);
	c_GameImage* p_FindSet(String,int,int,int,bool,String);
	c_GameImage* p_LoadTileset2(String,int,int,int,int,String,bool,bool,bool,int,int,int);
	void mark();
	String debug();
};
String dbg_type(c_ImageBank**p){return "ImageBank";}
class c_GameSound : public Object{
	public:
	bool m_preLoad;
	String m_screenName;
	String m_path;
	c_Sound* m_sound;
	String m_name;
	c_GameSound();
	void p_Load2(String,bool,String);
	void mark();
	String debug();
};
String dbg_type(c_GameSound**p){return "GameSound";}
class c_Map4 : public Object{
	public:
	c_Node4* m_root;
	c_Map4();
	c_Map4* m_new();
	c_MapKeys2* p_Keys();
	c_Node4* p_FirstNode();
	virtual int p_Compare(String,String)=0;
	c_Node4* p_FindNode(String);
	c_GameSound* p_Get(String);
	void mark();
	String debug();
};
String dbg_type(c_Map4**p){return "Map";}
class c_StringMap4 : public c_Map4{
	public:
	c_StringMap4();
	c_StringMap4* m_new();
	int p_Compare(String,String);
	void mark();
	String debug();
};
String dbg_type(c_StringMap4**p){return "StringMap";}
class c_SoundBank : public c_StringMap4{
	public:
	c_SoundBank();
	c_SoundBank* m_new();
	static String m_path;
	void mark();
	String debug();
};
String dbg_type(c_SoundBank**p){return "SoundBank";}
class c_InputCache : public Object{
	public:
	c_KeyEventEnumerator* m_keyHitEnumerator;
	c_KeyEventEnumerator* m_keyDownEnumerator;
	c_KeyEventEnumerator* m_keyReleasedEnumerator;
	c_EnumWrapper* m_keyHitWrapper;
	c_EnumWrapper* m_keyDownWrapper;
	c_EnumWrapper* m_keyReleasedWrapper;
	Array<c_TouchData* > m_touchData;
	bool m_monitorTouch;
	bool m_monitorMouse;
	int m_touchDownCount;
	int m_touchHitCount;
	int m_touchReleasedCount;
	int m_maxTouchDown;
	int m_maxTouchHit;
	int m_maxTouchReleased;
	int m_minTouchDown;
	int m_minTouchHit;
	int m_minTouchReleased;
	Array<int > m_touchHit;
	Array<int > m_touchHitTime;
	Array<int > m_touchDown;
	Array<int > m_touchDownTime;
	Array<int > m_touchReleasedTime;
	Array<int > m_touchReleased;
	Array<Float > m_touchX;
	Array<Float > m_touchY;
	Array<int > m_currentTouchDown;
	Array<int > m_currentTouchHit;
	Array<int > m_currentTouchReleased;
	int m_mouseDownCount;
	int m_mouseHitCount;
	int m_mouseReleasedCount;
	int m_mouseX;
	int m_mouseY;
	Array<int > m_mouseHit;
	Array<int > m_mouseHitTime;
	Array<int > m_mouseDown;
	Array<int > m_mouseDownTime;
	Array<int > m_mouseReleasedTime;
	Array<int > m_mouseReleased;
	Array<int > m_currentMouseDown;
	Array<int > m_currentMouseHit;
	Array<int > m_currentMouseReleased;
	int m_keyDownCount;
	int m_keyHitCount;
	int m_keyReleasedCount;
	int m_monitorKeyCount;
	Array<bool > m_monitorKey;
	Array<int > m_keyHit;
	Array<int > m_keyHitTime;
	Array<int > m_keyDown;
	Array<int > m_keyDownTime;
	Array<int > m_keyReleasedTime;
	Array<int > m_keyReleased;
	Array<int > m_currentKeysDown;
	Array<int > m_currentKeysHit;
	Array<int > m_currentKeysReleased;
	Float m_flingThreshold;
	int m_longPressTime;
	c_InputCache();
	c_InputCache* m_new();
	void p_ReadInput();
	void p_HandleEvents(c_Screen*);
	void mark();
	String debug();
};
String dbg_type(c_InputCache**p){return "InputCache";}
class c_InputEventEnumerator : public Object{
	public:
	c_InputCache* m_ic;
	int m_eventType;
	c_InputEventEnumerator();
	c_InputEventEnumerator* m_new(c_InputCache*,int);
	c_InputEventEnumerator* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_InputEventEnumerator**p){return "InputEventEnumerator";}
class c_KeyEventEnumerator : public c_InputEventEnumerator{
	public:
	c_KeyEvent* m_event;
	c_KeyEventEnumerator();
	c_KeyEventEnumerator* m_new(c_InputCache*,int);
	c_KeyEventEnumerator* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_KeyEventEnumerator**p){return "KeyEventEnumerator";}
class c_InputEvent : public Object{
	public:
	int m_eventType;
	c_InputEvent();
	c_InputEvent* m_new(int);
	c_InputEvent* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_InputEvent**p){return "InputEvent";}
class c_KeyEvent : public c_InputEvent{
	public:
	c_KeyEvent();
	c_KeyEvent* m_new(int);
	c_KeyEvent* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_KeyEvent**p){return "KeyEvent";}
class c_EnumWrapper : public Object{
	public:
	c_KeyEventEnumerator* m_wrappedEnum;
	c_EnumWrapper();
	c_EnumWrapper* m_new(c_KeyEventEnumerator*);
	c_EnumWrapper* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_EnumWrapper**p){return "EnumWrapper";}
class c_TouchData : public Object{
	public:
	int m_firstTouchX;
	int m_firstTouchY;
	int m_lastTouchX;
	int m_lastTouchY;
	int m_firstTouchTime;
	bool m_testedLongPress;
	bool m_firedLongPress;
	Array<int > m_flingSamplesX;
	Array<int > m_flingSamplesY;
	Array<int > m_flingSamplesTime;
	int m_flingSampleCount;
	int m_flingSampleNext;
	bool m_movedTooFar;
	Float m_touchVelocityX;
	Float m_touchVelocityY;
	Float m_touchVelocitySpeed;
	int m_distanceMovedX;
	int m_distanceMovedY;
	c_TouchData();
	c_TouchData* m_new();
	void p_AddFlingSample(int,int);
	void p_Reset(int,int);
	void p_Update3(int,int);
	void mark();
	String debug();
};
String dbg_type(c_TouchData**p){return "TouchData";}
class c_DiddyMouse : public Object{
	public:
	int m_lastX;
	int m_lastY;
	c_DiddyMouse();
	c_DiddyMouse* m_new();
	void p_Update2();
	void mark();
	String debug();
};
String dbg_type(c_DiddyMouse**p){return "DiddyMouse";}
int bbMain();
class c_ConstInfo : public Object{
	public:
	c_ConstInfo();
	void mark();
	String debug();
};
String dbg_type(c_ConstInfo**p){return "ConstInfo";}
class c_Stack : public Object{
	public:
	Array<c_ConstInfo* > m_data;
	int m_length;
	c_Stack();
	c_Stack* m_new();
	c_Stack* m_new2(Array<c_ConstInfo* >);
	void p_Push(c_ConstInfo*);
	void p_Push2(Array<c_ConstInfo* >,int,int);
	void p_Push3(Array<c_ConstInfo* >,int);
	Array<c_ConstInfo* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_Stack**p){return "Stack";}
class c_FieldInfo : public Object{
	public:
	String m__name;
	int m__attrs;
	c_ClassInfo* m__type;
	c_FieldInfo();
	c_FieldInfo* m_new(String,int,c_ClassInfo*);
	c_FieldInfo* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_FieldInfo**p){return "FieldInfo";}
class c_Stack2 : public Object{
	public:
	Array<c_FieldInfo* > m_data;
	int m_length;
	c_Stack2();
	c_Stack2* m_new();
	c_Stack2* m_new2(Array<c_FieldInfo* >);
	void p_Push4(c_FieldInfo*);
	void p_Push5(Array<c_FieldInfo* >,int,int);
	void p_Push6(Array<c_FieldInfo* >,int);
	Array<c_FieldInfo* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_Stack2**p){return "Stack";}
class c_GlobalInfo : public Object{
	public:
	c_GlobalInfo();
	void mark();
	String debug();
};
String dbg_type(c_GlobalInfo**p){return "GlobalInfo";}
class c_Stack3 : public Object{
	public:
	Array<c_GlobalInfo* > m_data;
	int m_length;
	c_Stack3();
	c_Stack3* m_new();
	c_Stack3* m_new2(Array<c_GlobalInfo* >);
	void p_Push7(c_GlobalInfo*);
	void p_Push8(Array<c_GlobalInfo* >,int,int);
	void p_Push9(Array<c_GlobalInfo* >,int);
	Array<c_GlobalInfo* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_Stack3**p){return "Stack";}
class c_MethodInfo : public Object{
	public:
	String m__name;
	int m__attrs;
	c_ClassInfo* m__retType;
	Array<c_ClassInfo* > m__argTypes;
	c_MethodInfo();
	c_MethodInfo* m_new(String,int,c_ClassInfo*,Array<c_ClassInfo* >);
	c_MethodInfo* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_MethodInfo**p){return "MethodInfo";}
class c_Stack4 : public Object{
	public:
	Array<c_MethodInfo* > m_data;
	int m_length;
	c_Stack4();
	c_Stack4* m_new();
	c_Stack4* m_new2(Array<c_MethodInfo* >);
	void p_Push10(c_MethodInfo*);
	void p_Push11(Array<c_MethodInfo* >,int,int);
	void p_Push12(Array<c_MethodInfo* >,int);
	Array<c_MethodInfo* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_Stack4**p){return "Stack";}
class c_Stack5 : public Object{
	public:
	Array<c_FunctionInfo* > m_data;
	int m_length;
	c_Stack5();
	c_Stack5* m_new();
	c_Stack5* m_new2(Array<c_FunctionInfo* >);
	void p_Push13(c_FunctionInfo*);
	void p_Push14(Array<c_FunctionInfo* >,int,int);
	void p_Push15(Array<c_FunctionInfo* >,int);
	Array<c_FunctionInfo* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_Stack5**p){return "Stack";}
class c_R19 : public c_FieldInfo{
	public:
	c_R19();
	c_R19* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R19**p){return "R19";}
class c_R20 : public c_FieldInfo{
	public:
	c_R20();
	c_R20* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R20**p){return "R20";}
class c_R21 : public c_FieldInfo{
	public:
	c_R21();
	c_R21* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R21**p){return "R21";}
class c_R22 : public c_FieldInfo{
	public:
	c_R22();
	c_R22* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R22**p){return "R22";}
class c_R23 : public c_MethodInfo{
	public:
	c_R23();
	c_R23* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R23**p){return "R23";}
class c_R24 : public c_MethodInfo{
	public:
	c_R24();
	c_R24* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R24**p){return "R24";}
class c_R25 : public c_MethodInfo{
	public:
	c_R25();
	c_R25* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R25**p){return "R25";}
class c_R26 : public c_MethodInfo{
	public:
	c_R26();
	c_R26* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R26**p){return "R26";}
class c_R27 : public c_MethodInfo{
	public:
	c_R27();
	c_R27* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R27**p){return "R27";}
class c_R28 : public c_MethodInfo{
	public:
	c_R28();
	c_R28* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R28**p){return "R28";}
class c_R30 : public c_MethodInfo{
	public:
	c_R30();
	c_R30* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R30**p){return "R30";}
class c_R29 : public c_FunctionInfo{
	public:
	c_R29();
	c_R29* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R29**p){return "R29";}
class c_R32 : public c_FunctionInfo{
	public:
	c_R32();
	c_R32* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R32**p){return "R32";}
class c_R34 : public c_FunctionInfo{
	public:
	c_R34();
	c_R34* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R34**p){return "R34";}
class c_R36 : public c_FunctionInfo{
	public:
	c_R36();
	c_R36* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R36**p){return "R36";}
class c_R38 : public c_FunctionInfo{
	public:
	c_R38();
	c_R38* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R38**p){return "R38";}
class c_R40 : public c_FunctionInfo{
	public:
	c_R40();
	c_R40* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R40**p){return "R40";}
class c_R42 : public c_FieldInfo{
	public:
	c_R42();
	c_R42* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R42**p){return "R42";}
class c_R44 : public c_MethodInfo{
	public:
	c_R44();
	c_R44* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R44**p){return "R44";}
class c_R45 : public c_MethodInfo{
	public:
	c_R45();
	c_R45* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R45**p){return "R45";}
class c_R43 : public c_FunctionInfo{
	public:
	c_R43();
	c_R43* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R43**p){return "R43";}
class c_R46 : public c_FunctionInfo{
	public:
	c_R46();
	c_R46* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R46**p){return "R46";}
class c_R48 : public c_FieldInfo{
	public:
	c_R48();
	c_R48* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R48**p){return "R48";}
class c_R51 : public c_MethodInfo{
	public:
	c_R51();
	c_R51* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R51**p){return "R51";}
class c_R52 : public c_MethodInfo{
	public:
	c_R52();
	c_R52* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R52**p){return "R52";}
class c_R53 : public c_MethodInfo{
	public:
	c_R53();
	c_R53* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R53**p){return "R53";}
class c_R54 : public c_MethodInfo{
	public:
	c_R54();
	c_R54* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R54**p){return "R54";}
class c_R55 : public c_MethodInfo{
	public:
	c_R55();
	c_R55* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R55**p){return "R55";}
class c_R49 : public c_FunctionInfo{
	public:
	c_R49();
	c_R49* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R49**p){return "R49";}
class c_R50 : public c_FunctionInfo{
	public:
	c_R50();
	c_R50* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R50**p){return "R50";}
class c_R56 : public c_FunctionInfo{
	public:
	c_R56();
	c_R56* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R56**p){return "R56";}
class c_R58 : public c_FieldInfo{
	public:
	c_R58();
	c_R58* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R58**p){return "R58";}
class c_R61 : public c_MethodInfo{
	public:
	c_R61();
	c_R61* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R61**p){return "R61";}
class c_R62 : public c_MethodInfo{
	public:
	c_R62();
	c_R62* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R62**p){return "R62";}
class c_R63 : public c_MethodInfo{
	public:
	c_R63();
	c_R63* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R63**p){return "R63";}
class c_R64 : public c_MethodInfo{
	public:
	c_R64();
	c_R64* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R64**p){return "R64";}
class c_R65 : public c_MethodInfo{
	public:
	c_R65();
	c_R65* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R65**p){return "R65";}
class c_R59 : public c_FunctionInfo{
	public:
	c_R59();
	c_R59* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R59**p){return "R59";}
class c_R60 : public c_FunctionInfo{
	public:
	c_R60();
	c_R60* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R60**p){return "R60";}
class c_R66 : public c_FunctionInfo{
	public:
	c_R66();
	c_R66* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R66**p){return "R66";}
class c_R68 : public c_FieldInfo{
	public:
	c_R68();
	c_R68* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R68**p){return "R68";}
class c_R72 : public c_MethodInfo{
	public:
	c_R72();
	c_R72* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R72**p){return "R72";}
class c_R73 : public c_MethodInfo{
	public:
	c_R73();
	c_R73* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R73**p){return "R73";}
class c_R74 : public c_MethodInfo{
	public:
	c_R74();
	c_R74* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R74**p){return "R74";}
class c_R69 : public c_FunctionInfo{
	public:
	c_R69();
	c_R69* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R69**p){return "R69";}
class c_R70 : public c_FunctionInfo{
	public:
	c_R70();
	c_R70* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R70**p){return "R70";}
class c_R71 : public c_FunctionInfo{
	public:
	c_R71();
	c_R71* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R71**p){return "R71";}
class c_R75 : public c_FunctionInfo{
	public:
	c_R75();
	c_R75* m_new();
	void mark();
	String debug();
};
String dbg_type(c_R75**p){return "R75";}
class c_UnknownClass : public c_ClassInfo{
	public:
	c_UnknownClass();
	c_UnknownClass* m_new();
	void mark();
	String debug();
};
String dbg_type(c_UnknownClass**p){return "UnknownClass";}
extern c_ClassInfo* bb_reflection__unknownClass;
extern gxtkGraphics* bb_graphics_device;
int bb_graphics_SetGraphicsDevice(gxtkGraphics*);
class c_Image : public Object{
	public:
	gxtkSurface* m_surface;
	int m_width;
	int m_height;
	Array<c_Frame* > m_frames;
	int m_flags;
	Float m_tx;
	Float m_ty;
	c_Image* m_source;
	c_Image();
	static int m_DefaultFlags;
	c_Image* m_new();
	int p_SetHandle(Float,Float);
	int p_ApplyFlags(int);
	c_Image* p_Init2(gxtkSurface*,int,int);
	c_Image* p_Init3(gxtkSurface*,int,int,int,int,int,int,c_Image*,int,int,int,int);
	Float p_HandleX();
	Float p_HandleY();
	int p_Width();
	int p_Height();
	int p_Frames();
	c_Image* p_GrabImage(int,int,int,int,int,int);
	int p_Discard();
	void mark();
	String debug();
};
String dbg_type(c_Image**p){return "Image";}
class c_GraphicsContext : public Object{
	public:
	c_Image* m_defaultFont;
	c_Image* m_font;
	int m_firstChar;
	int m_matrixSp;
	Float m_ix;
	Float m_iy;
	Float m_jx;
	Float m_jy;
	Float m_tx;
	Float m_ty;
	int m_tformed;
	int m_matDirty;
	Float m_color_r;
	Float m_color_g;
	Float m_color_b;
	Float m_alpha;
	int m_blend;
	Float m_scissor_x;
	Float m_scissor_y;
	Float m_scissor_width;
	Float m_scissor_height;
	Array<Float > m_matrixStack;
	c_GraphicsContext();
	c_GraphicsContext* m_new();
	int p_Validate();
	void mark();
	String debug();
};
String dbg_type(c_GraphicsContext**p){return "GraphicsContext";}
extern c_GraphicsContext* bb_graphics_context;
String bb_data_FixDataPath(String);
class c_Frame : public Object{
	public:
	int m_x;
	int m_y;
	c_Frame();
	c_Frame* m_new(int,int);
	c_Frame* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_Frame**p){return "Frame";}
c_Image* bb_graphics_LoadImage(String,int,int);
c_Image* bb_graphics_LoadImage2(String,int,int,int,int);
int bb_graphics_SetFont(c_Image*,int);
extern gxtkAudio* bb_audio_device;
int bb_audio_SetAudioDevice(gxtkAudio*);
class c_InputDevice : public Object{
	public:
	Array<c_JoyState* > m__joyStates;
	Array<bool > m__keyDown;
	int m__keyHitPut;
	Array<int > m__keyHitQueue;
	Array<int > m__keyHit;
	int m__charGet;
	int m__charPut;
	Array<int > m__charQueue;
	Float m__mouseX;
	Float m__mouseY;
	Array<Float > m__touchX;
	Array<Float > m__touchY;
	Float m__accelX;
	Float m__accelY;
	Float m__accelZ;
	c_InputDevice();
	c_InputDevice* m_new();
	void p_PutKeyHit(int);
	void p_BeginUpdate();
	void p_EndUpdate();
	void p_KeyEvent(int,int);
	void p_MouseEvent(int,int,Float,Float);
	void p_TouchEvent(int,int,Float,Float);
	void p_MotionEvent(int,int,Float,Float,Float);
	Float p_MouseX();
	Float p_MouseY();
	int p_KeyHit(int);
	bool p_KeyDown(int);
	Float p_TouchX(int);
	Float p_TouchY(int);
	void mark();
	String debug();
};
String dbg_type(c_InputDevice**p){return "InputDevice";}
class c_JoyState : public Object{
	public:
	Array<Float > m_joyx;
	Array<Float > m_joyy;
	Array<Float > m_joyz;
	Array<bool > m_buttons;
	c_JoyState();
	c_JoyState* m_new();
	void mark();
	String debug();
};
String dbg_type(c_JoyState**p){return "JoyState";}
extern c_InputDevice* bb_input_device;
int bb_input_SetInputDevice(c_InputDevice*);
extern gxtkGraphics* bb_graphics_renderDevice;
int bb_graphics_SetMatrix(Float,Float,Float,Float,Float,Float);
int bb_graphics_SetMatrix2(Array<Float >);
int bb_graphics_SetColor(Float,Float,Float);
int bb_graphics_SetAlpha(Float);
int bb_graphics_SetBlend(int);
int bb_graphics_DeviceWidth();
int bb_graphics_DeviceHeight();
int bb_graphics_SetScissor(Float,Float,Float,Float);
int bb_graphics_BeginRender();
int bb_graphics_EndRender();
class c_BBGameEvent : public Object{
	public:
	c_BBGameEvent();
	void mark();
	String debug();
};
String dbg_type(c_BBGameEvent**p){return "BBGameEvent";}
int bb_app_EndApp();
extern Float bb_framework_DEVICE_WIDTH;
extern Float bb_framework_DEVICE_HEIGHT;
extern Float bb_framework_SCREEN_WIDTH;
extern Float bb_framework_SCREEN_HEIGHT;
extern Float bb_framework_SCREEN_WIDTH2;
extern Float bb_framework_SCREEN_HEIGHT2;
extern Float bb_framework_SCREENX_RATIO;
extern Float bb_framework_SCREENY_RATIO;
Float bb_input_MouseX();
Float bb_input_MouseY();
extern int bb_random_Seed;
class c_DeltaTimer : public Object{
	public:
	Float m_targetfps;
	Float m_lastticks;
	Float m_delta;
	Float m_frametime;
	Float m_currentticks;
	c_DeltaTimer();
	c_DeltaTimer* m_new(Float);
	c_DeltaTimer* m_new2();
	void p_UpdateDelta();
	void mark();
	String debug();
};
String dbg_type(c_DeltaTimer**p){return "DeltaTimer";}
int bb_app_Millisecs();
extern c_DeltaTimer* bb_framework_dt;
extern int bb_app__updateRate;
int bb_app_SetUpdateRate(int);
class c_Sprite : public Object{
	public:
	c_GameImage* m_image;
	Float m_x;
	Float m_y;
	Float m_alpha;
	c_HitBox* m_hitBox;
	bool m_visible;
	int m_frame;
	int m_frameStart;
	int m_frameEnd;
	bool m_reverse;
	bool m_pingPong;
	bool m_loop;
	int m_frameSpeed;
	int m_frameTimer;
	int m_ping;
	Float m_scaleX;
	Float m_scaleY;
	int m_red;
	int m_green;
	int m_blue;
	Float m_rotation;
	c_Sprite();
	void p_SetHitBox(int,int,int,int);
	c_Sprite* m_new(c_GameImage*,Float,Float);
	c_Sprite* m_new2();
	void p_SetFrame(int,int,int,bool,bool);
	int p_ResetAnim();
	int p_UpdateAnimation();
	void p_Draw3(Float,Float,bool);
	void p_Draw4(bool);
	virtual void p_Draw();
	void p_DrawHitBox(Float,Float);
	void mark();
	String debug();
};
String dbg_type(c_Sprite**p){return "Sprite";}
class c_Particle : public c_Sprite{
	public:
	c_Particle();
	static int m_MAX_PARTICLES;
	c_Particle* m_new();
	static Array<c_Particle* > m_particles;
	static void m_Cache();
	void mark();
	String debug();
};
String dbg_type(c_Particle**p){return "Particle";}
class c_HitBox : public Object{
	public:
	Float m_x;
	Float m_y;
	Float m_w;
	Float m_h;
	c_HitBox();
	c_HitBox* m_new(Float,Float,Float,Float);
	c_HitBox* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_HitBox**p){return "HitBox";}
class c_FPSCounter : public Object{
	public:
	c_FPSCounter();
	static int m_startTime;
	static int m_fpsCount;
	static int m_totalFPS;
	static void m_Update();
	static void m_Draw(int,int,Float,Float);
	void mark();
	String debug();
};
String dbg_type(c_FPSCounter**p){return "FPSCounter";}
int bb_graphics_PushMatrix();
int bb_math_Max(int,int);
Float bb_math_Max2(Float,Float);
int bb_math_Min(int,int);
Float bb_math_Min2(Float,Float);
int bb_graphics_DebugRenderDevice();
int bb_graphics_Cls(Float,Float,Float);
int bb_graphics_Transform(Float,Float,Float,Float,Float,Float);
int bb_graphics_Transform2(Array<Float >);
int bb_graphics_Scale(Float,Float);
int bb_graphics_Translate(Float,Float);
class c_IComparable : public virtual gc_interface{
	public:
};
class c_DiddyDataLayer : public Object,public virtual c_IComparable{
	public:
	int m_index;
	c_DiddyDataObjects* m_objects;
	c_DiddyDataLayer();
	void p_Render2(Float,Float);
	void mark();
	String debug();
};
String dbg_type(c_DiddyDataLayer**p){return "DiddyDataLayer";}
class c_ICollection : public Object{
	public:
	c_ICollection();
	virtual c_IEnumerator* p_Enumerator()=0;
	c_IEnumerator* p_ObjectEnumerator();
	virtual int p_Size()=0;
	void mark();
	String debug();
};
String dbg_type(c_ICollection**p){return "ICollection";}
class c_IList : public c_ICollection{
	public:
	int m_modCount;
	c_IList();
	c_IEnumerator* p_Enumerator();
	virtual c_DiddyDataLayer* p_Get2(int)=0;
	virtual void p_RangeCheck(int);
	void mark();
	String debug();
};
String dbg_type(c_IList**p){return "IList";}
class c_ArrayList : public c_IList{
	public:
	int m_size;
	Array<Object* > m_elements;
	c_ArrayList();
	c_IEnumerator* p_Enumerator();
	int p_Size();
	void p_RangeCheck(int);
	c_DiddyDataLayer* p_Get2(int);
	void mark();
	String debug();
};
String dbg_type(c_ArrayList**p){return "ArrayList";}
class c_DiddyDataLayers : public c_ArrayList{
	public:
	c_DiddyDataLayers();
	void mark();
	String debug();
};
String dbg_type(c_DiddyDataLayers**p){return "DiddyDataLayers";}
class c_IEnumerator : public Object{
	public:
	c_IEnumerator();
	virtual bool p_HasNext()=0;
	virtual c_DiddyDataLayer* p_NextObject()=0;
	c_IEnumerator* m_new();
	void mark();
	String debug();
};
String dbg_type(c_IEnumerator**p){return "IEnumerator";}
class c_DiddyDataObject : public Object{
	public:
	bool m_visible;
	String m_imageName;
	Float m_alpha;
	c_GameImage* m_image;
	int m_red;
	int m_green;
	int m_blue;
	Float m_x;
	Float m_y;
	Float m_rotation;
	Float m_scaleX;
	Float m_scaleY;
	c_DiddyDataObject();
	void p_Render2(Float,Float);
	void mark();
	String debug();
};
String dbg_type(c_DiddyDataObject**p){return "DiddyDataObject";}
class c_ICollection2 : public Object{
	public:
	c_ICollection2();
	c_ICollection2* m_new();
	virtual Array<Object* > p_ToArray()=0;
	virtual c_IEnumerator2* p_Enumerator()=0;
	c_IEnumerator2* p_ObjectEnumerator();
	virtual int p_Size()=0;
	void mark();
	String debug();
};
String dbg_type(c_ICollection2**p){return "ICollection";}
class c_IList2 : public c_ICollection2{
	public:
	int m_modCount;
	c_IList2();
	c_IList2* m_new();
	c_IEnumerator2* p_Enumerator();
	virtual c_DiddyDataObject* p_Get2(int)=0;
	virtual void p_RangeCheck(int);
	void mark();
	String debug();
};
String dbg_type(c_IList2**p){return "IList";}
class c_ArrayList2 : public c_IList2{
	public:
	Array<Object* > m_elements;
	int m_size;
	c_ArrayList2();
	c_ArrayList2* m_new();
	c_ArrayList2* m_new2(int);
	c_ArrayList2* m_new3(c_ICollection2*);
	c_IEnumerator2* p_Enumerator();
	Array<Object* > p_ToArray();
	int p_Size();
	void p_RangeCheck(int);
	c_DiddyDataObject* p_Get2(int);
	void mark();
	String debug();
};
String dbg_type(c_ArrayList2**p){return "ArrayList";}
class c_DiddyDataObjects : public c_ArrayList2{
	public:
	c_DiddyDataObjects();
	c_DiddyDataObjects* m_new();
	void mark();
	String debug();
};
String dbg_type(c_DiddyDataObjects**p){return "DiddyDataObjects";}
class c_IEnumerator2 : public Object{
	public:
	c_IEnumerator2();
	virtual bool p_HasNext()=0;
	virtual c_DiddyDataObject* p_NextObject()=0;
	c_IEnumerator2* m_new();
	void mark();
	String debug();
};
String dbg_type(c_IEnumerator2**p){return "IEnumerator";}
class c_MapKeys : public Object{
	public:
	c_Map3* m_map;
	c_MapKeys();
	c_MapKeys* m_new(c_Map3*);
	c_MapKeys* m_new2();
	c_KeyEnumerator* p_ObjectEnumerator();
	void mark();
	String debug();
};
String dbg_type(c_MapKeys**p){return "MapKeys";}
class c_KeyEnumerator : public Object{
	public:
	c_Node2* m_node;
	c_KeyEnumerator();
	c_KeyEnumerator* m_new(c_Node2*);
	c_KeyEnumerator* m_new2();
	bool p_HasNext();
	String p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_KeyEnumerator**p){return "KeyEnumerator";}
class c_Node2 : public Object{
	public:
	c_Node2* m_left;
	c_Node2* m_right;
	c_Node2* m_parent;
	String m_key;
	c_GameImage* m_value;
	int m_color;
	c_Node2();
	c_Node2* p_NextNode();
	c_Node2* m_new(String,c_GameImage*,int,c_Node2*);
	c_Node2* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_Node2**p){return "Node";}
void bb_assert_AssertError(String);
void bb_assert_AssertNotNull(Object*,String);
int bb_graphics_DrawImage(c_Image*,Float,Float,int);
int bb_graphics_Rotate(Float);
int bb_graphics_PopMatrix();
int bb_graphics_DrawImage2(c_Image*,Float,Float,Float,Float,Float,int);
int bb_graphics_DrawRect(Float,Float,Float,Float);
int bb_graphics_DrawText(String,Float,Float,Float,Float);
void bb_assert_Assert(bool,String);
String bb_functions_RSet(String,int,String);
String bb_functions_FormatNumber(Float,int,int,int);
int bb_audio_MusicState();
class c_SoundPlayer : public Object{
	public:
	c_SoundPlayer();
	static int m_channel;
	void mark();
	String debug();
};
String dbg_type(c_SoundPlayer**p){return "SoundPlayer";}
int bb_input_MouseHit(int);
int bb_input_TouchHit(int);
int bb_input_TouchDown(int);
Float bb_input_TouchX(int);
Float bb_input_TouchY(int);
int bb_input_MouseDown(int);
int bb_input_KeyHit(int);
int bb_input_KeyDown(int);
int bb_audio_SetMusicVolume(Float);
int bb_audio_SetChannelVolume(int,Float);
class c_Node3 : public Object{
	public:
	String m_key;
	c_Node3* m_right;
	c_Node3* m_left;
	c_Screen* m_value;
	int m_color;
	c_Node3* m_parent;
	c_Node3();
	c_Node3* m_new(String,c_Screen*,int,c_Node3*);
	c_Node3* m_new2();
	c_Node3* p_NextNode();
	void mark();
	String debug();
};
String dbg_type(c_Node3**p){return "Node";}
String bb_functions_StripExt(String);
String bb_functions_StripDir(String);
String bb_functions_StripAll(String);
c_Image* bb_functions_LoadAnimBitmap(String,int,int,int,c_Image*);
c_Image* bb_functions_LoadBitmap(String,int);
class c_MapKeys2 : public Object{
	public:
	c_Map4* m_map;
	c_MapKeys2();
	c_MapKeys2* m_new(c_Map4*);
	c_MapKeys2* m_new2();
	c_KeyEnumerator2* p_ObjectEnumerator();
	void mark();
	String debug();
};
String dbg_type(c_MapKeys2**p){return "MapKeys";}
class c_KeyEnumerator2 : public Object{
	public:
	c_Node4* m_node;
	c_KeyEnumerator2();
	c_KeyEnumerator2* m_new(c_Node4*);
	c_KeyEnumerator2* m_new2();
	bool p_HasNext();
	String p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_KeyEnumerator2**p){return "KeyEnumerator";}
class c_Node4 : public Object{
	public:
	c_Node4* m_left;
	c_Node4* m_right;
	c_Node4* m_parent;
	String m_key;
	c_GameSound* m_value;
	c_Node4();
	c_Node4* p_NextNode();
	void mark();
	String debug();
};
String dbg_type(c_Node4**p){return "Node";}
class c_Sound : public Object{
	public:
	gxtkSample* m_sample;
	c_Sound();
	c_Sound* m_new(gxtkSample*);
	c_Sound* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_Sound**p){return "Sound";}
c_Sound* bb_audio_LoadSound(String);
c_Sound* bb_functions_LoadSoundSample(String);
int bb_audio_PlayMusic(String,int);
extern Float bb_framework_defaultFadeTime;
class c_MapKeys3 : public Object{
	public:
	c_Map2* m_map;
	c_MapKeys3();
	c_MapKeys3* m_new(c_Map2*);
	c_MapKeys3* m_new2();
	c_KeyEnumerator3* p_ObjectEnumerator();
	void mark();
	String debug();
};
String dbg_type(c_MapKeys3**p){return "MapKeys";}
class c_KeyEnumerator3 : public Object{
	public:
	c_Node3* m_node;
	c_KeyEnumerator3();
	c_KeyEnumerator3* m_new(c_Node3*);
	c_KeyEnumerator3* m_new2();
	bool p_HasNext();
	String p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_KeyEnumerator3**p){return "KeyEnumerator";}
String bb_app_LoadString(String);
void bb_assert_AssertNotEqualInt(int,int,String);
class c_XMLParser : public Object{
	public:
	String m_str;
	int m_tagsLength;
	int m_quotesLength;
	int m_pisLength;
	Array<int > m_tags;
	Array<int > m_tagType;
	Array<int > m_quotes;
	Array<int > m_pis;
	int m_tagCount;
	int m_quoteCount;
	int m_piCount;
	c_XMLParser();
	c_XMLParser* m_new();
	void p_CacheControlCharacters();
	void p_TrimString(int,int,Array<int >);
	c_XMLElement* p_GetTagContents(int,int);
	c_XMLDocument* p_ParseString(String);
	c_XMLDocument* p_ParseFile(String);
	void mark();
	String debug();
};
String dbg_type(c_XMLParser**p){return "XMLParser";}
class c_XMLDocument : public Object{
	public:
	c_XMLElement* m_root;
	c_ArrayList3* m_pi;
	c_XMLDocument();
	c_XMLDocument* m_new(String);
	c_XMLDocument* m_new2(c_XMLElement*);
	c_XMLElement* p_Root();
	void mark();
	String debug();
};
String dbg_type(c_XMLDocument**p){return "XMLDocument";}
class c_XMLElement : public Object{
	public:
	c_XMLElement* m_parent;
	String m_name;
	c_ArrayList3* m_children;
	c_ArrayList4* m_attributes;
	bool m_pi;
	bool m_cdata;
	String m_value;
	c_XMLElement();
	c_XMLElement* m_new();
	c_XMLElement* m_new2(String,c_XMLElement*);
	String p_SetAttribute(String,String);
	void p_AddChild(c_XMLElement*);
	String p_GetAttribute(String,String);
	bool p_MatchesAttribute(String);
	c_ArrayList3* p_GetChildrenByName(String,String,String,String,String,String,String,String,String,String,String);
	c_ArrayList3* p_Children();
	String p_Name();
	void p_Name2(String);
	bool p_HasAttribute(String);
	String p_Value();
	void p_Value2(String);
	void mark();
	String debug();
};
String dbg_type(c_XMLElement**p){return "XMLElement";}
class c_ICollection3 : public Object{
	public:
	c_ICollection3();
	c_ICollection3* m_new();
	virtual Array<Object* > p_ToArray()=0;
	virtual bool p_Add(c_XMLElement*)=0;
	virtual bool p_Contains2(c_XMLElement*)=0;
	virtual bool p_IsEmpty()=0;
	virtual int p_Size()=0;
	virtual c_IEnumerator3* p_Enumerator()=0;
	c_IEnumerator3* p_ObjectEnumerator();
	void mark();
	String debug();
};
String dbg_type(c_ICollection3**p){return "ICollection";}
class c_IList3 : public c_ICollection3{
	public:
	int m_modCount;
	c_IList3();
	c_IList3* m_new();
	virtual c_XMLElement* p_RemoveLast()=0;
	virtual c_XMLElement* p_RemoveAt(int)=0;
	virtual void p_RangeCheck(int);
	virtual bool p_AddLast(c_XMLElement*)=0;
	c_IEnumerator3* p_Enumerator();
	virtual c_XMLElement* p_Get2(int)=0;
	void mark();
	String debug();
};
String dbg_type(c_IList3**p){return "IList";}
class c_ArrayList3 : public c_IList3{
	public:
	Array<Object* > m_elements;
	int m_size;
	c_ArrayList3();
	c_ArrayList3* m_new();
	c_ArrayList3* m_new2(int);
	c_ArrayList3* m_new3(c_ICollection3*);
	void p_EnsureCapacity(int);
	bool p_Add(c_XMLElement*);
	bool p_Contains2(c_XMLElement*);
	bool p_IsEmpty();
	void p_RangeCheck(int);
	c_XMLElement* p_RemoveAt(int);
	c_XMLElement* p_RemoveLast();
	bool p_AddLast(c_XMLElement*);
	c_IEnumerator3* p_Enumerator();
	int p_Size();
	Array<Object* > p_ToArray();
	c_XMLElement* p_Get2(int);
	void mark();
	String debug();
};
String dbg_type(c_ArrayList3**p){return "ArrayList";}
String bb_xml_UnescapeXMLString(String);
class c_XMLAttribute : public Object{
	public:
	String m_name;
	String m_value;
	c_XMLAttribute();
	c_XMLAttribute* m_new(String,String);
	c_XMLAttribute* m_new2();
	bool p_Matches(String);
	void mark();
	String debug();
};
String dbg_type(c_XMLAttribute**p){return "XMLAttribute";}
class c_ICollection4 : public Object{
	public:
	c_ICollection4();
	c_ICollection4* m_new();
	virtual Array<Object* > p_ToArray()=0;
	virtual int p_Size()=0;
	virtual bool p_Add2(c_XMLAttribute*)=0;
	virtual c_IEnumerator4* p_Enumerator()=0;
	c_IEnumerator4* p_ObjectEnumerator();
	void mark();
	String debug();
};
String dbg_type(c_ICollection4**p){return "ICollection";}
class c_IList4 : public c_ICollection4{
	public:
	int m_modCount;
	c_IList4();
	c_IList4* m_new();
	virtual c_XMLAttribute* p_Get2(int)=0;
	virtual void p_RangeCheck(int);
	c_IEnumerator4* p_Enumerator();
	void mark();
	String debug();
};
String dbg_type(c_IList4**p){return "IList";}
class c_ArrayList4 : public c_IList4{
	public:
	Array<Object* > m_elements;
	int m_size;
	c_ArrayList4();
	c_ArrayList4* m_new();
	c_ArrayList4* m_new2(int);
	c_ArrayList4* m_new3(c_ICollection4*);
	int p_Size();
	void p_RangeCheck(int);
	c_XMLAttribute* p_Get2(int);
	void p_EnsureCapacity(int);
	bool p_Add2(c_XMLAttribute*);
	c_IEnumerator4* p_Enumerator();
	Array<Object* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_ArrayList4**p){return "ArrayList";}
class c_IEnumerator3 : public Object{
	public:
	c_IEnumerator3();
	virtual bool p_HasNext()=0;
	virtual c_XMLElement* p_NextObject()=0;
	c_IEnumerator3* m_new();
	void mark();
	String debug();
};
String dbg_type(c_IEnumerator3**p){return "IEnumerator";}
class c_IEnumerator4 : public Object{
	public:
	c_IEnumerator4();
	virtual bool p_HasNext()=0;
	virtual c_XMLAttribute* p_NextObject()=0;
	c_IEnumerator4* m_new();
	void mark();
	String debug();
};
String dbg_type(c_IEnumerator4**p){return "IEnumerator";}
class c_JsonValue : public Object{
	public:
	c_JsonValue();
	c_JsonValue* m_new();
	virtual String p_StringValue();
	virtual int p_IntValue();
	void mark();
	String debug();
};
String dbg_type(c_JsonValue**p){return "JsonValue";}
class c_JsonObject : public c_JsonValue{
	public:
	c_StringMap5* m__data;
	c_JsonObject();
	c_JsonObject* m_new();
	c_JsonObject* m_new2(c_StringMap5*);
	c_JsonObject* m_new3(String);
	c_JsonValue* p_Get3(String,c_JsonValue*);
	c_StringMap5* p_GetData();
	int p_GetInt(String,int);
	void mark();
	String debug();
};
String dbg_type(c_JsonObject**p){return "JsonObject";}
class c_Map5 : public Object{
	public:
	c_Node5* m_root;
	c_Map5();
	c_Map5* m_new();
	virtual int p_Compare(String,String)=0;
	int p_RotateLeft4(c_Node5*);
	int p_RotateRight4(c_Node5*);
	int p_InsertFixup4(c_Node5*);
	bool p_Set4(String,c_JsonValue*);
	c_Node5* p_FindNode(String);
	bool p_Contains(String);
	c_JsonValue* p_Get(String);
	c_Node5* p_FirstNode();
	c_NodeEnumerator* p_ObjectEnumerator();
	void mark();
	String debug();
};
String dbg_type(c_Map5**p){return "Map";}
class c_StringMap5 : public c_Map5{
	public:
	c_StringMap5();
	c_StringMap5* m_new();
	int p_Compare(String,String);
	void mark();
	String debug();
};
String dbg_type(c_StringMap5**p){return "StringMap";}
class c_JsonParser : public Object{
	public:
	String m__text;
	int m__pos;
	String m__toke;
	int m__type;
	c_JsonParser();
	int p_GetChar();
	bool p_CParseDigits();
	bool p_CParseChar(int);
	int p_PeekChar();
	String p_Bump();
	c_JsonParser* m_new(String);
	c_JsonParser* m_new2();
	bool p_CParse(String);
	void p_Parse(String);
	int p_TokeType();
	String p_Toke();
	String p_ParseString2();
	String p_ParseNumber();
	Array<c_JsonValue* > p_ParseArray();
	c_JsonValue* p_ParseValue();
	c_StringMap5* p_ParseObject();
	void mark();
	String debug();
};
String dbg_type(c_JsonParser**p){return "JsonParser";}
class c_JsonError : public ThrowableObject{
	public:
	c_JsonError();
	c_JsonError* m_new();
	void mark();
	String debug();
};
String dbg_type(c_JsonError**p){return "JsonError";}
void bb_json_ThrowError();
class c_Stack6 : public Object{
	public:
	Array<String > m_data;
	int m_length;
	c_Stack6();
	c_Stack6* m_new();
	c_Stack6* m_new2(Array<String >);
	void p_Push16(String);
	void p_Push17(Array<String >,int,int);
	void p_Push18(Array<String >,int);
	Array<String > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_Stack6**p){return "Stack";}
class c_StringStack : public c_Stack6{
	public:
	c_StringStack();
	c_StringStack* m_new(Array<String >);
	c_StringStack* m_new2();
	String p_Join(String);
	void mark();
	String debug();
};
String dbg_type(c_StringStack**p){return "StringStack";}
class c_JsonString : public c_JsonValue{
	public:
	String m__value;
	c_JsonString();
	c_JsonString* m_new(String);
	c_JsonString* m_new2();
	static c_JsonString* m__null;
	static c_JsonString* m_Instance(String);
	String p_StringValue();
	void mark();
	String debug();
};
String dbg_type(c_JsonString**p){return "JsonString";}
class c_JsonNumber : public c_JsonValue{
	public:
	String m__value;
	c_JsonNumber();
	c_JsonNumber* m_new(String);
	c_JsonNumber* m_new2();
	static c_JsonNumber* m__zero;
	static c_JsonNumber* m_Instance(String);
	int p_IntValue();
	void mark();
	String debug();
};
String dbg_type(c_JsonNumber**p){return "JsonNumber";}
class c_JsonArray : public c_JsonValue{
	public:
	Array<c_JsonValue* > m__data;
	c_JsonArray();
	c_JsonArray* m_new(int);
	c_JsonArray* m_new2(Array<c_JsonValue* >);
	c_JsonArray* m_new3();
	void mark();
	String debug();
};
String dbg_type(c_JsonArray**p){return "JsonArray";}
class c_Stack7 : public Object{
	public:
	Array<c_JsonValue* > m_data;
	int m_length;
	c_Stack7();
	c_Stack7* m_new();
	c_Stack7* m_new2(Array<c_JsonValue* >);
	void p_Push19(c_JsonValue*);
	void p_Push20(Array<c_JsonValue* >,int,int);
	void p_Push21(Array<c_JsonValue* >,int);
	Array<c_JsonValue* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_Stack7**p){return "Stack";}
class c_JsonBool : public c_JsonValue{
	public:
	bool m__value;
	c_JsonBool();
	c_JsonBool* m_new(bool);
	c_JsonBool* m_new2();
	static c_JsonBool* m__true;
	static c_JsonBool* m__false;
	static c_JsonBool* m_Instance(bool);
	void mark();
	String debug();
};
String dbg_type(c_JsonBool**p){return "JsonBool";}
class c_JsonNull : public c_JsonValue{
	public:
	c_JsonNull();
	c_JsonNull* m_new();
	static c_JsonNull* m__instance;
	static c_JsonNull* m_Instance();
	void mark();
	String debug();
};
String dbg_type(c_JsonNull**p){return "JsonNull";}
class c_Node5 : public Object{
	public:
	String m_key;
	c_Node5* m_right;
	c_Node5* m_left;
	c_JsonValue* m_value;
	int m_color;
	c_Node5* m_parent;
	c_Node5();
	c_Node5* m_new(String,c_JsonValue*,int,c_Node5*);
	c_Node5* m_new2();
	c_Node5* p_NextNode();
	String p_Key();
	c_JsonValue* p_Value();
	void mark();
	String debug();
};
String dbg_type(c_Node5**p){return "Node";}
class c_NodeEnumerator : public Object{
	public:
	c_Node5* m_node;
	c_NodeEnumerator();
	c_NodeEnumerator* m_new(c_Node5*);
	c_NodeEnumerator* m_new2();
	bool p_HasNext();
	c_Node5* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_NodeEnumerator**p){return "NodeEnumerator";}
class c_TitleScreen : public c_Screen{
	public:
	c_TitleScreen();
	c_TitleScreen* m_new();
	void p_Start();
	void p_Render();
	void p_Update2();
	void mark();
	String debug();
};
String dbg_type(c_TitleScreen**p){return "TitleScreen";}
extern c_TitleScreen* bb_mainClass_titleScreen;
class c_GameScreen : public c_Screen{
	public:
	c_MyTileMap* m_tilemap;
	c_Bunny* m_bunny;
	int m_currentTime;
	int m_score;
	bool m_gameOver;
	c_GameScreen();
	c_GameScreen* m_new();
	void p_Start();
	void p_Update2();
	void p_Render();
	void mark();
	String debug();
};
String dbg_type(c_GameScreen**p){return "GameScreen";}
extern c_GameScreen* bb_mainClass_gameScreen;
void bb_functions_ExitApp();
int bb_graphics_DrawImageRect(c_Image*,Float,Float,int,int,int,int,int);
int bb_graphics_DrawImageRect2(c_Image*,Float,Float,int,int,int,int,Float,Float,Float,int);
class c_ListEnumerator : public c_IEnumerator{
	public:
	c_IList* m_lst;
	int m_expectedModCount;
	int m_index;
	int m_lastIndex;
	c_ListEnumerator();
	c_ListEnumerator* m_new(c_IList*);
	c_ListEnumerator* m_new2();
	void p_CheckConcurrency();
	bool p_HasNext();
	c_DiddyDataLayer* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ListEnumerator**p){return "ListEnumerator";}
class c_ArrayListEnumerator : public c_ListEnumerator{
	public:
	c_ArrayList* m_alst;
	c_ArrayListEnumerator();
	c_ArrayListEnumerator* m_new(c_ArrayList*);
	c_ArrayListEnumerator* m_new2();
	bool p_HasNext();
	c_DiddyDataLayer* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ArrayListEnumerator**p){return "ArrayListEnumerator";}
class c_ListEnumerator2 : public c_IEnumerator2{
	public:
	c_IList2* m_lst;
	int m_expectedModCount;
	int m_index;
	int m_lastIndex;
	c_ListEnumerator2();
	c_ListEnumerator2* m_new(c_IList2*);
	c_ListEnumerator2* m_new2();
	void p_CheckConcurrency();
	bool p_HasNext();
	c_DiddyDataObject* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ListEnumerator2**p){return "ListEnumerator";}
class c_ArrayListEnumerator2 : public c_ListEnumerator2{
	public:
	c_ArrayList2* m_alst;
	c_ArrayListEnumerator2();
	c_ArrayListEnumerator2* m_new(c_ArrayList2*);
	c_ArrayListEnumerator2* m_new2();
	bool p_HasNext();
	c_DiddyDataObject* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ArrayListEnumerator2**p){return "ArrayListEnumerator";}
class c_ListEnumerator3 : public c_IEnumerator3{
	public:
	c_IList3* m_lst;
	int m_expectedModCount;
	int m_index;
	int m_lastIndex;
	c_ListEnumerator3();
	c_ListEnumerator3* m_new(c_IList3*);
	c_ListEnumerator3* m_new2();
	void p_CheckConcurrency();
	bool p_HasNext();
	c_XMLElement* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ListEnumerator3**p){return "ListEnumerator";}
class c_ArrayListEnumerator3 : public c_ListEnumerator3{
	public:
	c_ArrayList3* m_alst;
	c_ArrayListEnumerator3();
	c_ArrayListEnumerator3* m_new(c_ArrayList3*);
	c_ArrayListEnumerator3* m_new2();
	bool p_HasNext();
	c_XMLElement* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ArrayListEnumerator3**p){return "ArrayListEnumerator";}
class c_ListEnumerator4 : public c_IEnumerator4{
	public:
	c_IList4* m_lst;
	int m_expectedModCount;
	int m_index;
	int m_lastIndex;
	c_ListEnumerator4();
	c_ListEnumerator4* m_new(c_IList4*);
	c_ListEnumerator4* m_new2();
	void p_CheckConcurrency();
	bool p_HasNext();
	c_XMLAttribute* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ListEnumerator4**p){return "ListEnumerator";}
class c_ArrayListEnumerator4 : public c_ListEnumerator4{
	public:
	c_ArrayList4* m_alst;
	c_ArrayListEnumerator4();
	c_ArrayListEnumerator4* m_new(c_ArrayList4*);
	c_ArrayListEnumerator4* m_new2();
	bool p_HasNext();
	c_XMLAttribute* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ArrayListEnumerator4**p){return "ArrayListEnumerator";}
class c_TileMapReader : public Object{
	public:
	c_TileMap* m_tileMap;
	String m_graphicsPath;
	c_TileMapReader();
	c_TileMapReader* m_new();
	virtual c_TileMap* p_LoadMap(String)=0;
	virtual c_TileMap* p_CreateMap();
	void mark();
	String debug();
};
String dbg_type(c_TileMapReader**p){return "TileMapReader";}
class c_TiledTileMapReader : public c_TileMapReader{
	public:
	c_XMLDocument* m_doc;
	c_TiledTileMapReader();
	c_TiledTileMapReader* m_new();
	c_TileMapProperty* p_ReadProperty(c_XMLElement*);
	void p_ReadProperties(c_XMLElement*,Object*);
	void p_DoPostLoad(Object*);
	c_TileMapImage* p_ReadImage(c_XMLElement*);
	c_TileMapTile* p_ReadTile(c_XMLElement*);
	c_TileMapTileset* p_ReadTileset(c_XMLElement*,c_TileMapTileset*);
	void p_ReadLayerAttributes(c_XMLElement*,c_TileMapLayer*);
	c_TileMapData* p_ReadTileData(c_XMLElement*,c_TileMapTileLayer*);
	c_TileMapTileLayer* p_ReadTileLayer(c_XMLElement*);
	c_TileMapObject* p_ReadObject(c_XMLElement*,c_TileMapObjectLayer*);
	c_TileMapObjectLayer* p_ReadObjectLayer(c_XMLElement*);
	c_TileMap* p_ReadMap(c_XMLElement*);
	c_TileMap* p_LoadMap(String);
	void mark();
	String debug();
};
String dbg_type(c_TiledTileMapReader**p){return "TiledTileMapReader";}
class c_MyTiledTileMapReader : public c_TiledTileMapReader{
	public:
	c_MyTiledTileMapReader();
	c_MyTiledTileMapReader* m_new();
	c_TileMap* p_CreateMap();
	void mark();
	String debug();
};
String dbg_type(c_MyTiledTileMapReader**p){return "MyTiledTileMapReader";}
class c_TileMapPropertyContainer : public Object{
	public:
	c_TileMapProperties* m_properties;
	c_TileMapPropertyContainer();
	c_TileMapPropertyContainer* m_new();
	void mark();
	String debug();
};
String dbg_type(c_TileMapPropertyContainer**p){return "TileMapPropertyContainer";}
class c_ITileMapPostLoad : public virtual gc_interface{
	public:
	virtual void p_PostLoad()=0;
};
class c_TileMap : public c_TileMapPropertyContainer,public virtual c_ITileMapPostLoad{
	public:
	bool m_wrapX;
	bool m_wrapY;
	String m_version;
	String m_orientation;
	int m_width;
	int m_height;
	int m_tileWidth;
	int m_tileHeight;
	int m_maxTileWidth;
	int m_maxTileHeight;
	c_StringMap7* m_tilesets;
	c_ArrayList6* m_layers;
	Array<c_TileMapTile* > m_tiles;
	c_TileMap();
	c_TileMap* m_new();
	c_TileMapTileset* p_CreateTileset();
	c_TileMapImage* p_CreateImage();
	c_TileMapTile* p_CreateTile(int);
	c_TileMapTileLayer* p_CreateTileLayer();
	c_TileMapData* p_CreateData(int,int);
	c_TileMapCell* p_CreateCell(int,int,int);
	c_TileMapObjectLayer* p_CreateObjectLayer();
	c_TileMapObject* p_CreateObject();
	void p_PreRenderMap();
	virtual void p_ConfigureLayer(c_TileMapLayer*);
	void p_PreRenderLayer(c_TileMapLayer*);
	virtual void p_DrawTile2(c_TileMapTileLayer*,c_TileMapTile*,int,int);
	void p_PostRenderLayer(c_TileMapLayer*);
	void p_PostRenderMap();
	void p_RenderMap(int,int,int,int,Float,Float);
	void p_PostLoad();
	void mark();
	String debug();
};
String dbg_type(c_TileMap**p){return "TileMap";}
class c_TileMapProperty : public Object{
	public:
	String m_name;
	String m_rawValue;
	int m_valueType;
	c_TileMapProperty();
	c_TileMapProperty* m_new(String,String);
	bool p_GetBool();
	Float p_GetFloat();
	int p_GetInt2();
	void mark();
	String debug();
};
String dbg_type(c_TileMapProperty**p){return "TileMapProperty";}
class c_TileMapProperties : public Object{
	public:
	c_StringMap6* m_props;
	c_TileMapProperties();
	c_TileMapProperties* m_new();
	bool p_Has(String);
	c_TileMapProperty* p_Get(String);
	void mark();
	String debug();
};
String dbg_type(c_TileMapProperties**p){return "TileMapProperties";}
class c_Map6 : public Object{
	public:
	c_Node6* m_root;
	c_Map6();
	c_Map6* m_new();
	virtual int p_Compare(String,String)=0;
	int p_RotateLeft5(c_Node6*);
	int p_RotateRight5(c_Node6*);
	int p_InsertFixup5(c_Node6*);
	bool p_Set5(String,c_TileMapProperty*);
	c_Node6* p_FindNode(String);
	bool p_Contains(String);
	c_TileMapProperty* p_Get(String);
	void mark();
	String debug();
};
String dbg_type(c_Map6**p){return "Map";}
class c_StringMap6 : public c_Map6{
	public:
	c_StringMap6();
	c_StringMap6* m_new();
	int p_Compare(String,String);
	void mark();
	String debug();
};
String dbg_type(c_StringMap6**p){return "StringMap";}
class c_Node6 : public Object{
	public:
	String m_key;
	c_Node6* m_right;
	c_Node6* m_left;
	c_TileMapProperty* m_value;
	int m_color;
	c_Node6* m_parent;
	c_Node6();
	c_Node6* m_new(String,c_TileMapProperty*,int,c_Node6*);
	c_Node6* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_Node6**p){return "Node";}
class c_TileMapTileset : public Object,public virtual c_ITileMapPostLoad{
	public:
	int m_firstGid;
	String m_source;
	String m_name;
	int m_tileWidth;
	int m_tileHeight;
	int m_spacing;
	int m_margin;
	c_TileMapImage* m_imageNode;
	c_ArrayList5* m_tileNodes;
	c_GameImage* m_image;
	int m_tileCount;
	Array<c_TileMapTile* > m_tiles;
	c_TileMapTileset();
	c_TileMapTileset* m_new();
	void p_PostLoad();
	void mark();
	String debug();
};
String dbg_type(c_TileMapTileset**p){return "TileMapTileset";}
class c_TileMapImage : public Object,public virtual c_ITileMapPostLoad{
	public:
	String m_source;
	int m_width;
	int m_height;
	String m_trans;
	int m_transR;
	int m_transG;
	int m_transB;
	c_TileMapImage();
	c_TileMapImage* m_new();
	void p_PostLoad();
	void mark();
	String debug();
};
String dbg_type(c_TileMapImage**p){return "TileMapImage";}
int bb_tile_HexToDec(String);
class c_TileMapTile : public c_TileMapPropertyContainer,public virtual c_ITileMapPostLoad{
	public:
	int m_id;
	c_GameImage* m_image;
	int m_height;
	int m_gid;
	int m_width;
	int m_animDelay;
	bool m_animated;
	int m_animNext;
	int m_animDirection;
	bool m_hasAnimDirection;
	c_TileMapTile();
	c_TileMapTile* m_new(int);
	c_TileMapTile* m_new2();
	void p_PostLoad();
	void mark();
	String debug();
};
String dbg_type(c_TileMapTile**p){return "TileMapTile";}
class c_ICollection5 : public Object{
	public:
	c_ICollection5();
	c_ICollection5* m_new();
	virtual Array<Object* > p_ToArray()=0;
	virtual bool p_Add3(c_TileMapTile*)=0;
	virtual c_IEnumerator6* p_Enumerator()=0;
	c_IEnumerator6* p_ObjectEnumerator();
	virtual int p_Size()=0;
	void mark();
	String debug();
};
String dbg_type(c_ICollection5**p){return "ICollection";}
class c_IList5 : public c_ICollection5{
	public:
	int m_modCount;
	c_IList5();
	c_IList5* m_new();
	c_IEnumerator6* p_Enumerator();
	virtual c_TileMapTile* p_Get2(int)=0;
	virtual void p_RangeCheck(int);
	void mark();
	String debug();
};
String dbg_type(c_IList5**p){return "IList";}
class c_ArrayList5 : public c_IList5{
	public:
	Array<Object* > m_elements;
	int m_size;
	c_ArrayList5();
	c_ArrayList5* m_new();
	c_ArrayList5* m_new2(int);
	c_ArrayList5* m_new3(c_ICollection5*);
	void p_EnsureCapacity(int);
	bool p_Add3(c_TileMapTile*);
	c_IEnumerator6* p_Enumerator();
	Array<Object* > p_ToArray();
	int p_Size();
	void p_RangeCheck(int);
	c_TileMapTile* p_Get2(int);
	void mark();
	String debug();
};
String dbg_type(c_ArrayList5**p){return "ArrayList";}
class c_Map7 : public Object{
	public:
	c_Node7* m_root;
	c_Map7();
	c_Map7* m_new();
	virtual int p_Compare(String,String)=0;
	int p_RotateLeft6(c_Node7*);
	int p_RotateRight6(c_Node7*);
	int p_InsertFixup6(c_Node7*);
	bool p_Set6(String,c_TileMapTileset*);
	c_MapValues* p_Values();
	c_Node7* p_FirstNode();
	void mark();
	String debug();
};
String dbg_type(c_Map7**p){return "Map";}
class c_StringMap7 : public c_Map7{
	public:
	c_StringMap7();
	c_StringMap7* m_new();
	int p_Compare(String,String);
	void mark();
	String debug();
};
String dbg_type(c_StringMap7**p){return "StringMap";}
class c_Node7 : public Object{
	public:
	String m_key;
	c_Node7* m_right;
	c_Node7* m_left;
	c_TileMapTileset* m_value;
	int m_color;
	c_Node7* m_parent;
	c_Node7();
	c_Node7* m_new(String,c_TileMapTileset*,int,c_Node7*);
	c_Node7* m_new2();
	c_Node7* p_NextNode();
	void mark();
	String debug();
};
String dbg_type(c_Node7**p){return "Node";}
class c_TileMapLayer : public c_TileMapPropertyContainer,public virtual c_ITileMapPostLoad{
	public:
	String m_name;
	int m_width;
	int m_height;
	int m_visible;
	Float m_opacity;
	c_TileMapLayer();
	c_TileMapLayer* m_new();
	void p_PostLoad();
	void mark();
	String debug();
};
String dbg_type(c_TileMapLayer**p){return "TileMapLayer";}
class c_TileMapTileLayer : public c_TileMapLayer{
	public:
	Float m_parallaxOffsetX;
	Float m_parallaxOffsetY;
	Float m_parallaxScaleX;
	Float m_parallaxScaleY;
	c_TileMapData* m_mapData;
	int m_maxTileHeight;
	int m_maxTileWidth;
	c_TileMapTileLayer();
	c_TileMapTileLayer* m_new();
	void mark();
	String debug();
};
String dbg_type(c_TileMapTileLayer**p){return "TileMapTileLayer";}
class c_TileMapData : public Object{
	public:
	int m_width;
	int m_height;
	Array<int > m_tiles;
	Array<c_TileMapCell* > m_cells;
	c_TileMapData();
	c_TileMapData* m_new(int,int);
	c_TileMapData* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_TileMapData**p){return "TileMapData";}
class c_TileMapCell : public Object{
	public:
	int m_gid;
	int m_x;
	int m_y;
	int m_originalGid;
	c_TileMapCell();
	c_TileMapCell* m_new(int,int,int);
	c_TileMapCell* m_new2();
	void mark();
	String debug();
};
String dbg_type(c_TileMapCell**p){return "TileMapCell";}
extern Array<int > bb_base64_BASE64_ARRAY;
void bb_base64_InitBase64();
Array<int > bb_base64_DecodeBase64Bytes(String);
class c_ICollection6 : public Object{
	public:
	c_ICollection6();
	c_ICollection6* m_new();
	virtual Array<Object* > p_ToArray()=0;
	virtual bool p_Add4(c_TileMapLayer*)=0;
	virtual c_IEnumerator5* p_Enumerator()=0;
	c_IEnumerator5* p_ObjectEnumerator();
	virtual int p_Size()=0;
	void mark();
	String debug();
};
String dbg_type(c_ICollection6**p){return "ICollection";}
class c_IList6 : public c_ICollection6{
	public:
	int m_modCount;
	c_IList6();
	c_IList6* m_new();
	c_IEnumerator5* p_Enumerator();
	virtual c_TileMapLayer* p_Get2(int)=0;
	virtual void p_RangeCheck(int);
	void mark();
	String debug();
};
String dbg_type(c_IList6**p){return "IList";}
class c_ArrayList6 : public c_IList6{
	public:
	Array<Object* > m_elements;
	int m_size;
	c_ArrayList6();
	c_ArrayList6* m_new();
	c_ArrayList6* m_new2(int);
	c_ArrayList6* m_new3(c_ICollection6*);
	void p_EnsureCapacity(int);
	bool p_Add4(c_TileMapLayer*);
	c_IEnumerator5* p_Enumerator();
	Array<Object* > p_ToArray();
	int p_Size();
	void p_RangeCheck(int);
	c_TileMapLayer* p_Get2(int);
	void mark();
	String debug();
};
String dbg_type(c_ArrayList6**p){return "ArrayList";}
class c_TileMapObjectLayer : public c_TileMapLayer{
	public:
	int m_color;
	c_ArrayList7* m_objects;
	c_TileMapObjectLayer();
	c_TileMapObjectLayer* m_new();
	void mark();
	String debug();
};
String dbg_type(c_TileMapObjectLayer**p){return "TileMapObjectLayer";}
int bb_tile_ColorToInt(String);
class c_TileMapObject : public c_TileMapPropertyContainer{
	public:
	String m_name;
	String m_objectType;
	int m_x;
	int m_y;
	int m_width;
	int m_height;
	c_TileMapObject();
	c_TileMapObject* m_new();
	void mark();
	String debug();
};
String dbg_type(c_TileMapObject**p){return "TileMapObject";}
class c_ICollection7 : public Object{
	public:
	c_ICollection7();
	c_ICollection7* m_new();
	virtual Array<Object* > p_ToArray()=0;
	virtual bool p_Add5(c_TileMapObject*)=0;
	void mark();
	String debug();
};
String dbg_type(c_ICollection7**p){return "ICollection";}
class c_IList7 : public c_ICollection7{
	public:
	int m_modCount;
	c_IList7();
	c_IList7* m_new();
	void mark();
	String debug();
};
String dbg_type(c_IList7**p){return "IList";}
class c_ArrayList7 : public c_IList7{
	public:
	Array<Object* > m_elements;
	int m_size;
	c_ArrayList7();
	c_ArrayList7* m_new();
	c_ArrayList7* m_new2(int);
	c_ArrayList7* m_new3(c_ICollection7*);
	void p_EnsureCapacity(int);
	bool p_Add5(c_TileMapObject*);
	Array<Object* > p_ToArray();
	void mark();
	String debug();
};
String dbg_type(c_ArrayList7**p){return "ArrayList";}
class c_MyTileMap : public c_TileMap{
	public:
	c_MyTileMap();
	c_MyTileMap* m_new();
	void p_ConfigureLayer(c_TileMapLayer*);
	void p_DrawTile2(c_TileMapTileLayer*,c_TileMapTile*,int,int);
	void mark();
	String debug();
};
String dbg_type(c_MyTileMap**p){return "MyTileMap";}
class c_Bunny : public c_Sprite{
	public:
	int m_bCount;
	Float m_flTimer;
	int m_direction;
	c_GameImage* m_walkImagesTop;
	c_GameImage* m_walkImagesBottom;
	c_GameImage* m_walkImagesRight;
	c_GameImage* m_walkImagesLeft;
	c_GameImage* m_standImage;
	Float m_speed;
	bool m_flickering;
	int m_health;
	bool m_isDead;
	int m_bWidth;
	int m_bHeight;
	int m_beHeight;
	int m_beWidth;
	c_Bunny();
	c_Bunny* m_new(c_GameImage*,Float,Float,int);
	c_Bunny* m_new2();
	void p_CheckCollision();
	void p_Update2();
	int p_GetXpos();
	int p_GetYpos();
	int p_GetHealth();
	void p_Draw();
	void mark();
	String debug();
};
String dbg_type(c_Bunny**p){return "Bunny";}
class c_Bullet : public Object{
	public:
	Float m_sx;
	Float m_sy;
	Float m_tx;
	Float m_ty;
	Float m_cx;
	Float m_cy;
	Float m_dx;
	Float m_dy;
	Float m_speed;
	c_DeltaTimer* m_dt;
	Float m_radius;
	c_Bullet();
	c_Bullet* m_new();
	void p_Init4(Float,Float,int,int);
	void p_Update2();
	Float p_GetXpos();
	Float p_GetRadius();
	Float p_GetYpos();
	void p_Render();
	void mark();
	String debug();
};
String dbg_type(c_Bullet**p){return "Bullet";}
int bb_bulletClass_GetDistance(int,int,int,int);
class c_List : public Object{
	public:
	c_Node8* m__head;
	c_List();
	c_List* m_new();
	c_Node8* p_AddLast2(c_Bullet*);
	c_List* m_new2(Array<c_Bullet* >);
	c_Enumerator2* p_ObjectEnumerator();
	bool p_Equals5(c_Bullet*,c_Bullet*);
	int p_RemoveEach(c_Bullet*);
	void p_Remove(c_Bullet*);
	int p_Clear();
	void mark();
	String debug();
};
String dbg_type(c_List**p){return "List";}
class c_Node8 : public Object{
	public:
	c_Node8* m__succ;
	c_Node8* m__pred;
	c_Bullet* m__data;
	c_Node8();
	c_Node8* m_new(c_Node8*,c_Node8*,c_Bullet*);
	c_Node8* m_new2();
	int p_Remove2();
	void mark();
	String debug();
};
String dbg_type(c_Node8**p){return "Node";}
class c_HeadNode : public c_Node8{
	public:
	c_HeadNode();
	c_HeadNode* m_new();
	void mark();
	String debug();
};
String dbg_type(c_HeadNode**p){return "HeadNode";}
extern c_List* bb_bulletClass_bullets;
int bb_bulletClass_CreateBullet(int,int,int,int);
class c_Hunter : public c_Sprite{
	public:
	int m_width;
	int m_height;
	Float m_sx;
	Float m_sy;
	Float m_speed;
	c_DeltaTimer* m_dt;
	c_GameImage* m_hunterImage;
	Float m_dx;
	Float m_dy;
	c_Hunter();
	Float p_GetXpos();
	int p_GetWidth();
	Float p_GetYpos();
	int p_GetHeight();
	c_Hunter* m_new();
	void p_CheckCollision();
	void p_Update3(int,int);
	void p_Render();
	void mark();
	String debug();
};
String dbg_type(c_Hunter**p){return "Hunter";}
class c_List2 : public Object{
	public:
	c_Node9* m__head;
	c_List2();
	c_List2* m_new();
	c_Node9* p_AddLast3(c_Hunter*);
	c_List2* m_new2(Array<c_Hunter* >);
	c_Enumerator* p_ObjectEnumerator();
	bool p_Equals6(c_Hunter*,c_Hunter*);
	int p_RemoveEach2(c_Hunter*);
	void p_Remove3(c_Hunter*);
	int p_Clear();
	void mark();
	String debug();
};
String dbg_type(c_List2**p){return "List";}
class c_Node9 : public Object{
	public:
	c_Node9* m__succ;
	c_Node9* m__pred;
	c_Hunter* m__data;
	c_Node9();
	c_Node9* m_new(c_Node9*,c_Node9*,c_Hunter*);
	c_Node9* m_new2();
	int p_Remove2();
	void mark();
	String debug();
};
String dbg_type(c_Node9**p){return "Node";}
class c_HeadNode2 : public c_Node9{
	public:
	c_HeadNode2();
	c_HeadNode2* m_new();
	void mark();
	String debug();
};
String dbg_type(c_HeadNode2**p){return "HeadNode";}
extern c_List2* bb_hunterClass_hunters;
class c_Enumerator : public Object{
	public:
	c_List2* m__list;
	c_Node9* m__curr;
	c_Enumerator();
	c_Enumerator* m_new(c_List2*);
	c_Enumerator* m_new2();
	bool p_HasNext();
	c_Hunter* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_Enumerator**p){return "Enumerator";}
class c_Enumerator2 : public Object{
	public:
	c_List* m__list;
	c_Node8* m__curr;
	c_Enumerator2();
	c_Enumerator2* m_new(c_List*);
	c_Enumerator2* m_new2();
	bool p_HasNext();
	c_Bullet* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_Enumerator2**p){return "Enumerator";}
int bb_bulletClass_UpdateBullets();
Float bb_random_Rnd();
Float bb_random_Rnd2(Float,Float);
Float bb_random_Rnd3(Float);
void bb_hunterClass_CreateHunter();
void bb_hunterClass_UpdateHunter(Float,Float);
int bb_bulletClass_RemoveBullets();
void bb_hunterClass_RemoveHunter();
class c_IEnumerator5 : public Object{
	public:
	c_IEnumerator5();
	virtual bool p_HasNext()=0;
	virtual c_TileMapLayer* p_NextObject()=0;
	c_IEnumerator5* m_new();
	void mark();
	String debug();
};
String dbg_type(c_IEnumerator5**p){return "IEnumerator";}
extern bool bb_mainClass_Debug;
int bb_graphics_DrawLine(Float,Float,Float,Float);
void bb_functions_DrawRectOutline(int,int,int,int);
int bb_graphics_DrawCircle(Float,Float,Float);
void bb_hunterClass_RenderHunter();
int bb_bulletClass_RenderBullets();
class c_MapValues : public Object{
	public:
	c_Map7* m_map;
	c_MapValues();
	c_MapValues* m_new(c_Map7*);
	c_MapValues* m_new2();
	c_ValueEnumerator* p_ObjectEnumerator();
	void mark();
	String debug();
};
String dbg_type(c_MapValues**p){return "MapValues";}
class c_ValueEnumerator : public Object{
	public:
	c_Node7* m_node;
	c_ValueEnumerator();
	c_ValueEnumerator* m_new(c_Node7*);
	c_ValueEnumerator* m_new2();
	bool p_HasNext();
	c_TileMapTileset* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ValueEnumerator**p){return "ValueEnumerator";}
class c_IEnumerator6 : public Object{
	public:
	c_IEnumerator6();
	virtual bool p_HasNext()=0;
	virtual c_TileMapTile* p_NextObject()=0;
	c_IEnumerator6* m_new();
	void mark();
	String debug();
};
String dbg_type(c_IEnumerator6**p){return "IEnumerator";}
class c_ListEnumerator5 : public c_IEnumerator6{
	public:
	c_IList5* m_lst;
	int m_expectedModCount;
	int m_index;
	int m_lastIndex;
	c_ListEnumerator5();
	c_ListEnumerator5* m_new(c_IList5*);
	c_ListEnumerator5* m_new2();
	void p_CheckConcurrency();
	bool p_HasNext();
	c_TileMapTile* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ListEnumerator5**p){return "ListEnumerator";}
class c_ArrayListEnumerator5 : public c_ListEnumerator5{
	public:
	c_ArrayList5* m_alst;
	c_ArrayListEnumerator5();
	c_ArrayListEnumerator5* m_new(c_ArrayList5*);
	c_ArrayListEnumerator5* m_new2();
	bool p_HasNext();
	c_TileMapTile* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ArrayListEnumerator5**p){return "ArrayListEnumerator";}
class c_ListEnumerator6 : public c_IEnumerator5{
	public:
	c_IList6* m_lst;
	int m_expectedModCount;
	int m_index;
	int m_lastIndex;
	c_ListEnumerator6();
	c_ListEnumerator6* m_new(c_IList6*);
	c_ListEnumerator6* m_new2();
	void p_CheckConcurrency();
	bool p_HasNext();
	c_TileMapLayer* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ListEnumerator6**p){return "ListEnumerator";}
class c_ArrayListEnumerator6 : public c_ListEnumerator6{
	public:
	c_ArrayList6* m_alst;
	c_ArrayListEnumerator6();
	c_ArrayListEnumerator6* m_new(c_ArrayList6*);
	c_ArrayListEnumerator6* m_new2();
	bool p_HasNext();
	c_TileMapLayer* p_NextObject();
	void mark();
	String debug();
};
String dbg_type(c_ArrayListEnumerator6**p){return "ArrayListEnumerator";}
c_DiddyException::c_DiddyException(){
	m_message=String();
	m_cause=0;
	m_type=String();
	m_fullType=String();
}
String c_DiddyException::p_Message(){
	DBG_ENTER("DiddyException.Message")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<22>");
	return m_message;
}
void c_DiddyException::p_Message2(String t_message){
	DBG_ENTER("DiddyException.Message")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_message,"message")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<26>");
	this->m_message=t_message;
}
ThrowableObject* c_DiddyException::p_Cause(){
	DBG_ENTER("DiddyException.Cause")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<30>");
	return m_cause;
}
void c_DiddyException::p_Cause2(ThrowableObject* t_cause){
	DBG_ENTER("DiddyException.Cause")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_cause,"cause")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<34>");
	if(t_cause==(this)){
		DBG_BLOCK();
		t_cause=0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<35>");
	gc_assign(this->m_cause,t_cause);
}
String c_DiddyException::p_Type(){
	DBG_ENTER("DiddyException.Type")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<39>");
	return m_type;
}
String c_DiddyException::p_FullType(){
	DBG_ENTER("DiddyException.FullType")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<43>");
	return m_fullType;
}
String c_DiddyException::p_ToString(bool t_recurse){
	DBG_ENTER("DiddyException.ToString")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_recurse,"recurse")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<63>");
	String t_rv=m_type+String(L": ",2)+m_message;
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<64>");
	if(t_recurse){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<65>");
		int t_depth=10;
		DBG_LOCAL(t_depth,"depth")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<66>");
		ThrowableObject* t_current=m_cause;
		DBG_LOCAL(t_current,"current")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<67>");
		while(((t_current)!=0) && t_depth>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<68>");
			if((dynamic_cast<c_DiddyException*>(t_current))!=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<69>");
				t_rv=t_rv+(String(L"\nCaused by ",11)+m_type+String(L": ",2)+dynamic_cast<c_DiddyException*>(t_current)->m_message);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<70>");
				t_current=dynamic_cast<c_DiddyException*>(t_current)->m_cause;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<71>");
				t_depth-=1;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<73>");
				t_rv=t_rv+String(L"\nCaused by a non-Diddy exception.",33);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<74>");
				t_current=0;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<78>");
	return t_rv;
}
c_DiddyException* c_DiddyException::m_new(String t_message,ThrowableObject* t_cause){
	DBG_ENTER("DiddyException.new")
	c_DiddyException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_message,"message")
	DBG_LOCAL(t_cause,"cause")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<47>");
	this->m_message=t_message;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<48>");
	gc_assign(this->m_cause,t_cause);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<49>");
	c_ClassInfo* t_ci=bb_reflection_GetClass2(this);
	DBG_LOCAL(t_ci,"ci")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<50>");
	if((t_ci)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<51>");
		this->m_fullType=t_ci->p_Name();
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<53>");
		this->m_fullType=String(L"diddy.exception.DiddyException",30);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<55>");
	if(this->m_fullType.Contains(String(L".",1))){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<56>");
		this->m_type=this->m_fullType.Slice(this->m_fullType.FindLast(String(L".",1))+1);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<58>");
		this->m_type=this->m_fullType;
	}
	return this;
}
void c_DiddyException::mark(){
	ThrowableObject::mark();
	gc_mark_q(m_cause);
}
String c_DiddyException::debug(){
	String t="(DiddyException)\n";
	t+=dbg_decl("message",&m_message);
	t+=dbg_decl("cause",&m_cause);
	t+=dbg_decl("type",&m_type);
	t+=dbg_decl("fullType",&m_fullType);
	return t;
}
c_ClassInfo::c_ClassInfo(){
	m__name=String();
	m__attrs=0;
	m__sclass=0;
	m__ifaces=Array<c_ClassInfo* >();
	m__rconsts=Array<c_ConstInfo* >();
	m__consts=Array<c_ConstInfo* >();
	m__rfields=Array<c_FieldInfo* >();
	m__fields=Array<c_FieldInfo* >();
	m__rglobals=Array<c_GlobalInfo* >();
	m__globals=Array<c_GlobalInfo* >();
	m__rmethods=Array<c_MethodInfo* >();
	m__methods=Array<c_MethodInfo* >();
	m__rfunctions=Array<c_FunctionInfo* >();
	m__functions=Array<c_FunctionInfo* >();
	m__ctors=Array<c_FunctionInfo* >();
}
String c_ClassInfo::p_Name(){
	DBG_ENTER("ClassInfo.Name")
	c_ClassInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<222>");
	return m__name;
}
c_ClassInfo* c_ClassInfo::m_new(String t_name,int t_attrs,c_ClassInfo* t_sclass,Array<c_ClassInfo* > t_ifaces){
	DBG_ENTER("ClassInfo.new")
	c_ClassInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_attrs,"attrs")
	DBG_LOCAL(t_sclass,"sclass")
	DBG_LOCAL(t_ifaces,"ifaces")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<215>");
	m__name=t_name;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<216>");
	m__attrs=t_attrs;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<217>");
	gc_assign(m__sclass,t_sclass);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<218>");
	gc_assign(m__ifaces,t_ifaces);
	return this;
}
c_ClassInfo* c_ClassInfo::m_new2(){
	DBG_ENTER("ClassInfo.new")
	c_ClassInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<212>");
	return this;
}
int c_ClassInfo::p_Init(){
	DBG_ENTER("ClassInfo.Init")
	c_ClassInfo *self=this;
	DBG_LOCAL(self,"Self")
	return 0;
}
int c_ClassInfo::p_InitR(){
	DBG_ENTER("ClassInfo.InitR")
	c_ClassInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<421>");
	if((m__sclass)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<422>");
		c_Stack* t_consts=(new c_Stack)->m_new2(m__sclass->m__rconsts);
		DBG_LOCAL(t_consts,"consts")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<423>");
		Array<c_ConstInfo* > t_=m__consts;
		int t_2=0;
		while(t_2<t_.Length()){
			DBG_BLOCK();
			c_ConstInfo* t_t=t_.At(t_2);
			t_2=t_2+1;
			DBG_LOCAL(t_t,"t")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<424>");
			t_consts->p_Push(t_t);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<426>");
		gc_assign(m__rconsts,t_consts->p_ToArray());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<427>");
		c_Stack2* t_fields=(new c_Stack2)->m_new2(m__sclass->m__rfields);
		DBG_LOCAL(t_fields,"fields")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<428>");
		Array<c_FieldInfo* > t_3=m__fields;
		int t_4=0;
		while(t_4<t_3.Length()){
			DBG_BLOCK();
			c_FieldInfo* t_t2=t_3.At(t_4);
			t_4=t_4+1;
			DBG_LOCAL(t_t2,"t")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<429>");
			t_fields->p_Push4(t_t2);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<431>");
		gc_assign(m__rfields,t_fields->p_ToArray());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<432>");
		c_Stack3* t_globals=(new c_Stack3)->m_new2(m__sclass->m__rglobals);
		DBG_LOCAL(t_globals,"globals")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<433>");
		Array<c_GlobalInfo* > t_5=m__globals;
		int t_6=0;
		while(t_6<t_5.Length()){
			DBG_BLOCK();
			c_GlobalInfo* t_t3=t_5.At(t_6);
			t_6=t_6+1;
			DBG_LOCAL(t_t3,"t")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<434>");
			t_globals->p_Push7(t_t3);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<436>");
		gc_assign(m__rglobals,t_globals->p_ToArray());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<437>");
		c_Stack4* t_methods=(new c_Stack4)->m_new2(m__sclass->m__rmethods);
		DBG_LOCAL(t_methods,"methods")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<438>");
		Array<c_MethodInfo* > t_7=m__methods;
		int t_8=0;
		while(t_8<t_7.Length()){
			DBG_BLOCK();
			c_MethodInfo* t_t4=t_7.At(t_8);
			t_8=t_8+1;
			DBG_LOCAL(t_t4,"t")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<439>");
			t_methods->p_Push10(t_t4);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<441>");
		gc_assign(m__rmethods,t_methods->p_ToArray());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<442>");
		c_Stack5* t_functions=(new c_Stack5)->m_new2(m__sclass->m__rfunctions);
		DBG_LOCAL(t_functions,"functions")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<443>");
		Array<c_FunctionInfo* > t_9=m__functions;
		int t_10=0;
		while(t_10<t_9.Length()){
			DBG_BLOCK();
			c_FunctionInfo* t_t5=t_9.At(t_10);
			t_10=t_10+1;
			DBG_LOCAL(t_t5,"t")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<444>");
			t_functions->p_Push13(t_t5);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<446>");
		gc_assign(m__rfunctions,t_functions->p_ToArray());
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<448>");
		gc_assign(m__rconsts,m__consts);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<449>");
		gc_assign(m__rfields,m__fields);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<450>");
		gc_assign(m__rglobals,m__globals);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<451>");
		gc_assign(m__rmethods,m__methods);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<452>");
		gc_assign(m__rfunctions,m__functions);
	}
	return 0;
}
void c_ClassInfo::mark(){
	Object::mark();
	gc_mark_q(m__sclass);
	gc_mark_q(m__ifaces);
	gc_mark_q(m__rconsts);
	gc_mark_q(m__consts);
	gc_mark_q(m__rfields);
	gc_mark_q(m__fields);
	gc_mark_q(m__rglobals);
	gc_mark_q(m__globals);
	gc_mark_q(m__rmethods);
	gc_mark_q(m__methods);
	gc_mark_q(m__rfunctions);
	gc_mark_q(m__functions);
	gc_mark_q(m__ctors);
}
String c_ClassInfo::debug(){
	String t="(ClassInfo)\n";
	t+=dbg_decl("_name",&m__name);
	t+=dbg_decl("_attrs",&m__attrs);
	t+=dbg_decl("_sclass",&m__sclass);
	t+=dbg_decl("_ifaces",&m__ifaces);
	t+=dbg_decl("_consts",&m__consts);
	t+=dbg_decl("_fields",&m__fields);
	t+=dbg_decl("_globals",&m__globals);
	t+=dbg_decl("_methods",&m__methods);
	t+=dbg_decl("_functions",&m__functions);
	t+=dbg_decl("_ctors",&m__ctors);
	t+=dbg_decl("_rconsts",&m__rconsts);
	t+=dbg_decl("_rglobals",&m__rglobals);
	t+=dbg_decl("_rfields",&m__rfields);
	t+=dbg_decl("_rmethods",&m__rmethods);
	t+=dbg_decl("_rfunctions",&m__rfunctions);
	return t;
}
c_Map::c_Map(){
	m_root=0;
}
c_Map* c_Map::m_new(){
	DBG_ENTER("Map.new")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>");
	return this;
}
int c_Map::p_RotateLeft(c_Node* t_node){
	DBG_ENTER("Map.RotateLeft")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>");
	c_Node* t_child=t_node->m_right;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>");
	gc_assign(t_node->m_right,t_child->m_left);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>");
	if((t_child->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>");
		gc_assign(t_child->m_left->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>");
		if(t_node==t_node->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>");
	gc_assign(t_child->m_left,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map::p_RotateRight(c_Node* t_node){
	DBG_ENTER("Map.RotateRight")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>");
	c_Node* t_child=t_node->m_left;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>");
	gc_assign(t_node->m_left,t_child->m_right);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>");
	if((t_child->m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>");
		gc_assign(t_child->m_right->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>");
		if(t_node==t_node->m_parent->m_right){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>");
	gc_assign(t_child->m_right,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map::p_InsertFixup(c_Node* t_node){
	DBG_ENTER("Map.InsertFixup")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>");
	while(((t_node->m_parent)!=0) && t_node->m_parent->m_color==-1 && ((t_node->m_parent->m_parent)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>");
		if(t_node->m_parent==t_node->m_parent->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>");
			c_Node* t_uncle=t_node->m_parent->m_parent->m_right;
			DBG_LOCAL(t_uncle,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>");
			if(((t_uncle)!=0) && t_uncle->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>");
				t_uncle->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>");
				t_uncle->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>");
				t_node=t_uncle->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>");
				if(t_node==t_node->m_parent->m_right){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>");
					p_RotateLeft(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>");
				p_RotateRight(t_node->m_parent->m_parent);
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>");
			c_Node* t_uncle2=t_node->m_parent->m_parent->m_left;
			DBG_LOCAL(t_uncle2,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>");
			if(((t_uncle2)!=0) && t_uncle2->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>");
				t_uncle2->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>");
				t_uncle2->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>");
				t_node=t_uncle2->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>");
				if(t_node==t_node->m_parent->m_left){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>");
					p_RotateRight(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>");
				p_RotateLeft(t_node->m_parent->m_parent);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>");
	m_root->m_color=1;
	return 0;
}
bool c_Map::p_Set(String t_key,c_ClassInfo* t_value){
	DBG_ENTER("Map.Set")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>");
	c_Node* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>");
	c_Node* t_parent=0;
	int t_cmp=0;
	DBG_LOCAL(t_parent,"parent")
	DBG_LOCAL(t_cmp,"cmp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>");
		t_parent=t_node;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>");
		t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>");
				gc_assign(t_node->m_value,t_value);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>");
				return false;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>");
	t_node=(new c_Node)->m_new(t_key,t_value,-1,t_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>");
	if((t_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>");
			gc_assign(t_parent->m_right,t_node);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>");
			gc_assign(t_parent->m_left,t_node);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>");
		p_InsertFixup(t_node);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>");
		gc_assign(m_root,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>");
	return true;
}
c_Node* c_Map::p_FindNode(String t_key){
	DBG_ENTER("Map.FindNode")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>");
	c_Node* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>");
		int t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_LOCAL(t_cmp,"cmp")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>");
				return t_node;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>");
	return t_node;
}
bool c_Map::p_Contains(String t_key){
	DBG_ENTER("Map.Contains")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>");
	bool t_=p_FindNode(t_key)!=0;
	return t_;
}
c_ClassInfo* c_Map::p_Get(String t_key){
	DBG_ENTER("Map.Get")
	c_Map *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>");
	c_Node* t_node=p_FindNode(t_key);
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>");
	if((t_node)!=0){
		DBG_BLOCK();
		return t_node->m_value;
	}
	return 0;
}
void c_Map::mark(){
	Object::mark();
	gc_mark_q(m_root);
}
String c_Map::debug(){
	String t="(Map)\n";
	t+=dbg_decl("root",&m_root);
	return t;
}
c_StringMap::c_StringMap(){
}
c_StringMap* c_StringMap::m_new(){
	DBG_ENTER("StringMap.new")
	c_StringMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>");
	c_Map::m_new();
	return this;
}
int c_StringMap::p_Compare(String t_lhs,String t_rhs){
	DBG_ENTER("StringMap.Compare")
	c_StringMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>");
	int t_=t_lhs.Compare(t_rhs);
	return t_;
}
void c_StringMap::mark(){
	c_Map::mark();
}
String c_StringMap::debug(){
	String t="(StringMap)\n";
	t=c_Map::debug()+t;
	return t;
}
c_StringMap* bb_reflection__classesMap;
Array<c_ClassInfo* > bb_reflection__classes;
c_Node::c_Node(){
	m_key=String();
	m_right=0;
	m_left=0;
	m_value=0;
	m_color=0;
	m_parent=0;
}
c_Node* c_Node::m_new(String t_key,c_ClassInfo* t_value,int t_color,c_Node* t_parent){
	DBG_ENTER("Node.new")
	c_Node *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_LOCAL(t_color,"color")
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>");
	this->m_key=t_key;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>");
	gc_assign(this->m_value,t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>");
	this->m_color=t_color;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>");
	gc_assign(this->m_parent,t_parent);
	return this;
}
c_Node* c_Node::m_new2(){
	DBG_ENTER("Node.new")
	c_Node *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>");
	return this;
}
void c_Node::mark(){
	Object::mark();
	gc_mark_q(m_right);
	gc_mark_q(m_left);
	gc_mark_q(m_value);
	gc_mark_q(m_parent);
}
String c_Node::debug(){
	String t="(Node)\n";
	t+=dbg_decl("key",&m_key);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("color",&m_color);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("left",&m_left);
	t+=dbg_decl("right",&m_right);
	return t;
}
c_ClassInfo* bb_reflection_GetClass(String t_name){
	DBG_ENTER("GetClass")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<463>");
	if(!((bb_reflection__classesMap)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<464>");
		gc_assign(bb_reflection__classesMap,(new c_StringMap)->m_new());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<465>");
		Array<c_ClassInfo* > t_=bb_reflection__classes;
		int t_2=0;
		while(t_2<t_.Length()){
			DBG_BLOCK();
			c_ClassInfo* t_c=t_.At(t_2);
			t_2=t_2+1;
			DBG_LOCAL(t_c,"c")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<466>");
			String t_name2=t_c->p_Name();
			DBG_LOCAL(t_name2,"name")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<467>");
			bb_reflection__classesMap->p_Set(t_name2,t_c);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<468>");
			int t_i=t_name2.FindLast(String(L".",1));
			DBG_LOCAL(t_i,"i")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<469>");
			if(t_i==-1){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<470>");
			t_name2=t_name2.Slice(t_i+1);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<471>");
			if(bb_reflection__classesMap->p_Contains(t_name2)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<472>");
				bb_reflection__classesMap->p_Set(t_name2,0);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<474>");
				bb_reflection__classesMap->p_Set(t_name2,t_c);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<478>");
	c_ClassInfo* t_3=bb_reflection__classesMap->p_Get(t_name);
	return t_3;
}
c__GetClass::c__GetClass(){
}
c__GetClass* c__GetClass::m_new(){
	DBG_ENTER("_GetClass.new")
	c__GetClass *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<608>");
	return this;
}
void c__GetClass::mark(){
	Object::mark();
}
String c__GetClass::debug(){
	String t="(_GetClass)\n";
	return t;
}
c__GetClass* bb_reflection__getClass;
c_ClassInfo* bb_reflection_GetClass2(Object* t_obj){
	DBG_ENTER("GetClass")
	DBG_LOCAL(t_obj,"obj")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<482>");
	c_ClassInfo* t_=bb_reflection__getClass->p_GetClass(t_obj);
	return t_;
}
c_AssertException::c_AssertException(){
}
c_AssertException* c_AssertException::m_new(String t_message,ThrowableObject* t_cause){
	DBG_ENTER("AssertException.new")
	c_AssertException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_message,"message")
	DBG_LOCAL(t_cause,"cause")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<86>");
	c_DiddyException::m_new(t_message,t_cause);
	return this;
}
void c_AssertException::mark(){
	c_DiddyException::mark();
}
String c_AssertException::debug(){
	String t="(AssertException)\n";
	t=c_DiddyException::debug()+t;
	return t;
}
c_ConcurrentModificationException::c_ConcurrentModificationException(){
}
c_ConcurrentModificationException* c_ConcurrentModificationException::m_new(String t_message,ThrowableObject* t_cause){
	DBG_ENTER("ConcurrentModificationException.new")
	c_ConcurrentModificationException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_message,"message")
	DBG_LOCAL(t_cause,"cause")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<92>");
	c_DiddyException::m_new(t_message,t_cause);
	return this;
}
void c_ConcurrentModificationException::mark(){
	c_DiddyException::mark();
}
String c_ConcurrentModificationException::debug(){
	String t="(ConcurrentModificationException)\n";
	t=c_DiddyException::debug()+t;
	return t;
}
c_IndexOutOfBoundsException::c_IndexOutOfBoundsException(){
}
c_IndexOutOfBoundsException* c_IndexOutOfBoundsException::m_new(String t_message,ThrowableObject* t_cause){
	DBG_ENTER("IndexOutOfBoundsException.new")
	c_IndexOutOfBoundsException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_message,"message")
	DBG_LOCAL(t_cause,"cause")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<98>");
	c_DiddyException::m_new(t_message,t_cause);
	return this;
}
void c_IndexOutOfBoundsException::mark(){
	c_DiddyException::mark();
}
String c_IndexOutOfBoundsException::debug(){
	String t="(IndexOutOfBoundsException)\n";
	t=c_DiddyException::debug()+t;
	return t;
}
c_IllegalArgumentException::c_IllegalArgumentException(){
}
c_IllegalArgumentException* c_IllegalArgumentException::m_new(String t_message,ThrowableObject* t_cause){
	DBG_ENTER("IllegalArgumentException.new")
	c_IllegalArgumentException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_message,"message")
	DBG_LOCAL(t_cause,"cause")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<104>");
	c_DiddyException::m_new(t_message,t_cause);
	return this;
}
void c_IllegalArgumentException::mark(){
	c_DiddyException::mark();
}
String c_IllegalArgumentException::debug(){
	String t="(IllegalArgumentException)\n";
	t=c_DiddyException::debug()+t;
	return t;
}
c_XMLParseException::c_XMLParseException(){
}
c_XMLParseException* c_XMLParseException::m_new(String t_message,ThrowableObject* t_cause){
	DBG_ENTER("XMLParseException.new")
	c_XMLParseException *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_message,"message")
	DBG_LOCAL(t_cause,"cause")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/exception.monkey<110>");
	c_DiddyException::m_new(t_message,t_cause);
	return this;
}
void c_XMLParseException::mark(){
	c_DiddyException::mark();
}
String c_XMLParseException::debug(){
	String t="(XMLParseException)\n";
	t=c_DiddyException::debug()+t;
	return t;
}
c_BoolObject::c_BoolObject(){
	m_value=false;
}
c_BoolObject* c_BoolObject::m_new(bool t_value){
	DBG_ENTER("BoolObject.new")
	c_BoolObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<11>");
	this->m_value=t_value;
	return this;
}
bool c_BoolObject::p_ToBool(){
	DBG_ENTER("BoolObject.ToBool")
	c_BoolObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<15>");
	return m_value;
}
bool c_BoolObject::p_Equals(c_BoolObject* t_box){
	DBG_ENTER("BoolObject.Equals")
	c_BoolObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<19>");
	bool t_=m_value==t_box->m_value;
	return t_;
}
c_BoolObject* c_BoolObject::m_new2(){
	DBG_ENTER("BoolObject.new")
	c_BoolObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<7>");
	return this;
}
void c_BoolObject::mark(){
	Object::mark();
}
String c_BoolObject::debug(){
	String t="(BoolObject)\n";
	t+=dbg_decl("value",&m_value);
	return t;
}
c_IntObject::c_IntObject(){
	m_value=0;
}
c_IntObject* c_IntObject::m_new(int t_value){
	DBG_ENTER("IntObject.new")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<27>");
	this->m_value=t_value;
	return this;
}
c_IntObject* c_IntObject::m_new2(Float t_value){
	DBG_ENTER("IntObject.new")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<31>");
	this->m_value=int(t_value);
	return this;
}
int c_IntObject::p_ToInt(){
	DBG_ENTER("IntObject.ToInt")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<35>");
	return m_value;
}
Float c_IntObject::p_ToFloat(){
	DBG_ENTER("IntObject.ToFloat")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<39>");
	Float t_=Float(m_value);
	return t_;
}
String c_IntObject::p_ToString2(){
	DBG_ENTER("IntObject.ToString")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<43>");
	String t_=String(m_value);
	return t_;
}
bool c_IntObject::p_Equals2(c_IntObject* t_box){
	DBG_ENTER("IntObject.Equals")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<47>");
	bool t_=m_value==t_box->m_value;
	return t_;
}
int c_IntObject::p_Compare2(c_IntObject* t_box){
	DBG_ENTER("IntObject.Compare")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<51>");
	int t_=m_value-t_box->m_value;
	return t_;
}
c_IntObject* c_IntObject::m_new3(){
	DBG_ENTER("IntObject.new")
	c_IntObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<23>");
	return this;
}
void c_IntObject::mark(){
	Object::mark();
}
String c_IntObject::debug(){
	String t="(IntObject)\n";
	t+=dbg_decl("value",&m_value);
	return t;
}
c_FloatObject::c_FloatObject(){
	m_value=FLOAT(.0);
}
c_FloatObject* c_FloatObject::m_new(int t_value){
	DBG_ENTER("FloatObject.new")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<59>");
	this->m_value=Float(t_value);
	return this;
}
c_FloatObject* c_FloatObject::m_new2(Float t_value){
	DBG_ENTER("FloatObject.new")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<63>");
	this->m_value=t_value;
	return this;
}
int c_FloatObject::p_ToInt(){
	DBG_ENTER("FloatObject.ToInt")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<67>");
	int t_=int(m_value);
	return t_;
}
Float c_FloatObject::p_ToFloat(){
	DBG_ENTER("FloatObject.ToFloat")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<71>");
	return m_value;
}
String c_FloatObject::p_ToString2(){
	DBG_ENTER("FloatObject.ToString")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<75>");
	String t_=String(m_value);
	return t_;
}
bool c_FloatObject::p_Equals3(c_FloatObject* t_box){
	DBG_ENTER("FloatObject.Equals")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<79>");
	bool t_=m_value==t_box->m_value;
	return t_;
}
int c_FloatObject::p_Compare3(c_FloatObject* t_box){
	DBG_ENTER("FloatObject.Compare")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<83>");
	if(m_value<t_box->m_value){
		DBG_BLOCK();
		return -1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<84>");
	int t_=((m_value>t_box->m_value)?1:0);
	return t_;
}
c_FloatObject* c_FloatObject::m_new3(){
	DBG_ENTER("FloatObject.new")
	c_FloatObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<55>");
	return this;
}
void c_FloatObject::mark(){
	Object::mark();
}
String c_FloatObject::debug(){
	String t="(FloatObject)\n";
	t+=dbg_decl("value",&m_value);
	return t;
}
c_StringObject::c_StringObject(){
	m_value=String();
}
c_StringObject* c_StringObject::m_new(int t_value){
	DBG_ENTER("StringObject.new")
	c_StringObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<92>");
	this->m_value=String(t_value);
	return this;
}
c_StringObject* c_StringObject::m_new2(Float t_value){
	DBG_ENTER("StringObject.new")
	c_StringObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<96>");
	this->m_value=String(t_value);
	return this;
}
c_StringObject* c_StringObject::m_new3(String t_value){
	DBG_ENTER("StringObject.new")
	c_StringObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<100>");
	this->m_value=t_value;
	return this;
}
String c_StringObject::p_ToString2(){
	DBG_ENTER("StringObject.ToString")
	c_StringObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<104>");
	return m_value;
}
bool c_StringObject::p_Equals4(c_StringObject* t_box){
	DBG_ENTER("StringObject.Equals")
	c_StringObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<108>");
	bool t_=m_value==t_box->m_value;
	return t_;
}
int c_StringObject::p_Compare4(c_StringObject* t_box){
	DBG_ENTER("StringObject.Compare")
	c_StringObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<112>");
	int t_=m_value.Compare(t_box->m_value);
	return t_;
}
c_StringObject* c_StringObject::m_new4(){
	DBG_ENTER("StringObject.new")
	c_StringObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<88>");
	return this;
}
void c_StringObject::mark(){
	Object::mark();
}
String c_StringObject::debug(){
	String t="(StringObject)\n";
	t+=dbg_decl("value",&m_value);
	return t;
}
Object* bb_boxes_BoxBool(bool t_value){
	DBG_ENTER("BoxBool")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<139>");
	Object* t_=((new c_BoolObject)->m_new(t_value));
	return t_;
}
Object* bb_boxes_BoxInt(int t_value){
	DBG_ENTER("BoxInt")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<143>");
	Object* t_=((new c_IntObject)->m_new(t_value));
	return t_;
}
Object* bb_boxes_BoxFloat(Float t_value){
	DBG_ENTER("BoxFloat")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<147>");
	Object* t_=((new c_FloatObject)->m_new2(t_value));
	return t_;
}
Object* bb_boxes_BoxString(String t_value){
	DBG_ENTER("BoxString")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<151>");
	Object* t_=((new c_StringObject)->m_new3(t_value));
	return t_;
}
bool bb_boxes_UnboxBool(Object* t_box){
	DBG_ENTER("UnboxBool")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<155>");
	bool t_=dynamic_cast<c_BoolObject*>(t_box)->m_value;
	return t_;
}
int bb_boxes_UnboxInt(Object* t_box){
	DBG_ENTER("UnboxInt")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<159>");
	int t_=dynamic_cast<c_IntObject*>(t_box)->m_value;
	return t_;
}
Float bb_boxes_UnboxFloat(Object* t_box){
	DBG_ENTER("UnboxFloat")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<163>");
	Float t_=dynamic_cast<c_FloatObject*>(t_box)->m_value;
	return t_;
}
String bb_boxes_UnboxString(Object* t_box){
	DBG_ENTER("UnboxString")
	DBG_LOCAL(t_box,"box")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/boxes.monkey<167>");
	String t_=dynamic_cast<c_StringObject*>(t_box)->m_value;
	return t_;
}
c_R16::c_R16(){
}
c_R16* c_R16::m_new(){
	c_ClassInfo::m_new(String(L"monkey.lang.Object",18),1,0,Array<c_ClassInfo* >());
	return this;
}
int c_R16::p_Init(){
	p_InitR();
	return 0;
}
void c_R16::mark(){
	c_ClassInfo::mark();
}
String c_R16::debug(){
	String t="(R16)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R17::c_R17(){
}
c_R17* c_R17::m_new(){
	c_ClassInfo::m_new(String(L"monkey.lang.Throwable",21),33,bb_reflection__classes.At(0),Array<c_ClassInfo* >());
	return this;
}
int c_R17::p_Init(){
	p_InitR();
	return 0;
}
void c_R17::mark(){
	c_ClassInfo::mark();
}
String c_R17::debug(){
	String t="(R17)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R18::c_R18(){
}
c_R18* c_R18::m_new(){
	c_ClassInfo::m_new(String(L"diddy.exception.DiddyException",30),32,bb_reflection__classes.At(1),Array<c_ClassInfo* >());
	return this;
}
int c_R18::p_Init(){
	gc_assign(m__fields,Array<c_FieldInfo* >(4));
	gc_assign(m__fields.At(0),((new c_R19)->m_new()));
	gc_assign(m__fields.At(1),((new c_R20)->m_new()));
	gc_assign(m__fields.At(2),((new c_R21)->m_new()));
	gc_assign(m__fields.At(3),((new c_R22)->m_new()));
	gc_assign(m__methods,Array<c_MethodInfo* >(7));
	gc_assign(m__methods.At(0),((new c_R23)->m_new()));
	gc_assign(m__methods.At(1),((new c_R24)->m_new()));
	gc_assign(m__methods.At(2),((new c_R25)->m_new()));
	gc_assign(m__methods.At(3),((new c_R26)->m_new()));
	gc_assign(m__methods.At(4),((new c_R27)->m_new()));
	gc_assign(m__methods.At(5),((new c_R28)->m_new()));
	gc_assign(m__methods.At(6),((new c_R30)->m_new()));
	gc_assign(m__ctors,Array<c_FunctionInfo* >(1));
	gc_assign(m__ctors.At(0),((new c_R29)->m_new()));
	p_InitR();
	return 0;
}
void c_R18::mark(){
	c_ClassInfo::mark();
}
String c_R18::debug(){
	String t="(R18)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R31::c_R31(){
}
c_R31* c_R31::m_new(){
	c_ClassInfo::m_new(String(L"diddy.exception.AssertException",31),32,bb_reflection__classes.At(2),Array<c_ClassInfo* >());
	return this;
}
int c_R31::p_Init(){
	gc_assign(m__ctors,Array<c_FunctionInfo* >(1));
	gc_assign(m__ctors.At(0),((new c_R32)->m_new()));
	p_InitR();
	return 0;
}
void c_R31::mark(){
	c_ClassInfo::mark();
}
String c_R31::debug(){
	String t="(R31)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R33::c_R33(){
}
c_R33* c_R33::m_new(){
	c_ClassInfo::m_new(String(L"diddy.exception.ConcurrentModificationException",47),32,bb_reflection__classes.At(2),Array<c_ClassInfo* >());
	return this;
}
int c_R33::p_Init(){
	gc_assign(m__ctors,Array<c_FunctionInfo* >(1));
	gc_assign(m__ctors.At(0),((new c_R34)->m_new()));
	p_InitR();
	return 0;
}
void c_R33::mark(){
	c_ClassInfo::mark();
}
String c_R33::debug(){
	String t="(R33)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R35::c_R35(){
}
c_R35* c_R35::m_new(){
	c_ClassInfo::m_new(String(L"diddy.exception.IndexOutOfBoundsException",41),32,bb_reflection__classes.At(2),Array<c_ClassInfo* >());
	return this;
}
int c_R35::p_Init(){
	gc_assign(m__ctors,Array<c_FunctionInfo* >(1));
	gc_assign(m__ctors.At(0),((new c_R36)->m_new()));
	p_InitR();
	return 0;
}
void c_R35::mark(){
	c_ClassInfo::mark();
}
String c_R35::debug(){
	String t="(R35)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R37::c_R37(){
}
c_R37* c_R37::m_new(){
	c_ClassInfo::m_new(String(L"diddy.exception.IllegalArgumentException",40),32,bb_reflection__classes.At(2),Array<c_ClassInfo* >());
	return this;
}
int c_R37::p_Init(){
	gc_assign(m__ctors,Array<c_FunctionInfo* >(1));
	gc_assign(m__ctors.At(0),((new c_R38)->m_new()));
	p_InitR();
	return 0;
}
void c_R37::mark(){
	c_ClassInfo::mark();
}
String c_R37::debug(){
	String t="(R37)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R39::c_R39(){
}
c_R39* c_R39::m_new(){
	c_ClassInfo::m_new(String(L"diddy.exception.XMLParseException",33),32,bb_reflection__classes.At(2),Array<c_ClassInfo* >());
	return this;
}
int c_R39::p_Init(){
	gc_assign(m__ctors,Array<c_FunctionInfo* >(1));
	gc_assign(m__ctors.At(0),((new c_R40)->m_new()));
	p_InitR();
	return 0;
}
void c_R39::mark(){
	c_ClassInfo::mark();
}
String c_R39::debug(){
	String t="(R39)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_R41::c_R41(){
}
c_R41* c_R41::m_new(){
	c_ClassInfo::m_new(String(L"monkey.boxes.BoolObject",23),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >());
	gc_assign(bb_reflection__boolClass,(this));
	return this;
}
int c_R41::p_Init(){
	gc_assign(m__fields,Array<c_FieldInfo* >(1));
	gc_assign(m__fields.At(0),((new c_R42)->m_new()));
	gc_assign(m__methods,Array<c_MethodInfo* >(2));
	gc_assign(m__methods.At(0),((new c_R44)->m_new()));
	gc_assign(m__methods.At(1),((new c_R45)->m_new()));
	gc_assign(m__ctors,Array<c_FunctionInfo* >(2));
	gc_assign(m__ctors.At(0),((new c_R43)->m_new()));
	gc_assign(m__ctors.At(1),((new c_R46)->m_new()));
	p_InitR();
	return 0;
}
void c_R41::mark(){
	c_ClassInfo::mark();
}
String c_R41::debug(){
	String t="(R41)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_ClassInfo* bb_reflection__boolClass;
c_R47::c_R47(){
}
c_R47* c_R47::m_new(){
	c_ClassInfo::m_new(String(L"monkey.boxes.IntObject",22),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >());
	gc_assign(bb_reflection__intClass,(this));
	return this;
}
int c_R47::p_Init(){
	gc_assign(m__fields,Array<c_FieldInfo* >(1));
	gc_assign(m__fields.At(0),((new c_R48)->m_new()));
	gc_assign(m__methods,Array<c_MethodInfo* >(5));
	gc_assign(m__methods.At(0),((new c_R51)->m_new()));
	gc_assign(m__methods.At(1),((new c_R52)->m_new()));
	gc_assign(m__methods.At(2),((new c_R53)->m_new()));
	gc_assign(m__methods.At(3),((new c_R54)->m_new()));
	gc_assign(m__methods.At(4),((new c_R55)->m_new()));
	gc_assign(m__ctors,Array<c_FunctionInfo* >(3));
	gc_assign(m__ctors.At(0),((new c_R49)->m_new()));
	gc_assign(m__ctors.At(1),((new c_R50)->m_new()));
	gc_assign(m__ctors.At(2),((new c_R56)->m_new()));
	p_InitR();
	return 0;
}
void c_R47::mark(){
	c_ClassInfo::mark();
}
String c_R47::debug(){
	String t="(R47)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_ClassInfo* bb_reflection__intClass;
c_R57::c_R57(){
}
c_R57* c_R57::m_new(){
	c_ClassInfo::m_new(String(L"monkey.boxes.FloatObject",24),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >());
	gc_assign(bb_reflection__floatClass,(this));
	return this;
}
int c_R57::p_Init(){
	gc_assign(m__fields,Array<c_FieldInfo* >(1));
	gc_assign(m__fields.At(0),((new c_R58)->m_new()));
	gc_assign(m__methods,Array<c_MethodInfo* >(5));
	gc_assign(m__methods.At(0),((new c_R61)->m_new()));
	gc_assign(m__methods.At(1),((new c_R62)->m_new()));
	gc_assign(m__methods.At(2),((new c_R63)->m_new()));
	gc_assign(m__methods.At(3),((new c_R64)->m_new()));
	gc_assign(m__methods.At(4),((new c_R65)->m_new()));
	gc_assign(m__ctors,Array<c_FunctionInfo* >(3));
	gc_assign(m__ctors.At(0),((new c_R59)->m_new()));
	gc_assign(m__ctors.At(1),((new c_R60)->m_new()));
	gc_assign(m__ctors.At(2),((new c_R66)->m_new()));
	p_InitR();
	return 0;
}
void c_R57::mark(){
	c_ClassInfo::mark();
}
String c_R57::debug(){
	String t="(R57)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_ClassInfo* bb_reflection__floatClass;
c_R67::c_R67(){
}
c_R67* c_R67::m_new(){
	c_ClassInfo::m_new(String(L"monkey.boxes.StringObject",25),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >());
	gc_assign(bb_reflection__stringClass,(this));
	return this;
}
int c_R67::p_Init(){
	gc_assign(m__fields,Array<c_FieldInfo* >(1));
	gc_assign(m__fields.At(0),((new c_R68)->m_new()));
	gc_assign(m__methods,Array<c_MethodInfo* >(3));
	gc_assign(m__methods.At(0),((new c_R72)->m_new()));
	gc_assign(m__methods.At(1),((new c_R73)->m_new()));
	gc_assign(m__methods.At(2),((new c_R74)->m_new()));
	gc_assign(m__ctors,Array<c_FunctionInfo* >(4));
	gc_assign(m__ctors.At(0),((new c_R69)->m_new()));
	gc_assign(m__ctors.At(1),((new c_R70)->m_new()));
	gc_assign(m__ctors.At(2),((new c_R71)->m_new()));
	gc_assign(m__ctors.At(3),((new c_R75)->m_new()));
	p_InitR();
	return 0;
}
void c_R67::mark(){
	c_ClassInfo::mark();
}
String c_R67::debug(){
	String t="(R67)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_ClassInfo* bb_reflection__stringClass;
c_FunctionInfo::c_FunctionInfo(){
	m__name=String();
	m__attrs=0;
	m__retType=0;
	m__argTypes=Array<c_ClassInfo* >();
}
c_FunctionInfo* c_FunctionInfo::m_new(String t_name,int t_attrs,c_ClassInfo* t_retType,Array<c_ClassInfo* > t_argTypes){
	DBG_ENTER("FunctionInfo.new")
	c_FunctionInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_attrs,"attrs")
	DBG_LOCAL(t_retType,"retType")
	DBG_LOCAL(t_argTypes,"argTypes")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<179>");
	m__name=t_name;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<180>");
	m__attrs=t_attrs;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<181>");
	gc_assign(m__retType,t_retType);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<182>");
	gc_assign(m__argTypes,t_argTypes);
	return this;
}
c_FunctionInfo* c_FunctionInfo::m_new2(){
	DBG_ENTER("FunctionInfo.new")
	c_FunctionInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<176>");
	return this;
}
void c_FunctionInfo::mark(){
	Object::mark();
	gc_mark_q(m__retType);
	gc_mark_q(m__argTypes);
}
String c_FunctionInfo::debug(){
	String t="(FunctionInfo)\n";
	t+=dbg_decl("_name",&m__name);
	t+=dbg_decl("_attrs",&m__attrs);
	t+=dbg_decl("_retType",&m__retType);
	t+=dbg_decl("_argTypes",&m__argTypes);
	return t;
}
Array<c_FunctionInfo* > bb_reflection__functions;
c_R4::c_R4(){
}
c_R4* c_R4::m_new(){
	c_ClassInfo* t_[]={bb_reflection__boolClass};
	c_FunctionInfo::m_new(String(L"monkey.boxes.BoxBool",20),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R4::mark(){
	c_FunctionInfo::mark();
}
String c_R4::debug(){
	String t="(R4)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R5::c_R5(){
}
c_R5* c_R5::m_new(){
	c_ClassInfo* t_[]={bb_reflection__intClass};
	c_FunctionInfo::m_new(String(L"monkey.boxes.BoxInt",19),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R5::mark(){
	c_FunctionInfo::mark();
}
String c_R5::debug(){
	String t="(R5)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R6::c_R6(){
}
c_R6* c_R6::m_new(){
	c_ClassInfo* t_[]={bb_reflection__floatClass};
	c_FunctionInfo::m_new(String(L"monkey.boxes.BoxFloat",21),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R6::mark(){
	c_FunctionInfo::mark();
}
String c_R6::debug(){
	String t="(R6)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R7::c_R7(){
}
c_R7* c_R7::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass};
	c_FunctionInfo::m_new(String(L"monkey.boxes.BoxString",22),0,bb_reflection__classes.At(0),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R7::mark(){
	c_FunctionInfo::mark();
}
String c_R7::debug(){
	String t="(R7)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R8::c_R8(){
}
c_R8* c_R8::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(0)};
	c_FunctionInfo::m_new(String(L"monkey.boxes.UnboxBool",22),0,bb_reflection__boolClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R8::mark(){
	c_FunctionInfo::mark();
}
String c_R8::debug(){
	String t="(R8)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R9::c_R9(){
}
c_R9* c_R9::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(0)};
	c_FunctionInfo::m_new(String(L"monkey.boxes.UnboxInt",21),0,bb_reflection__intClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R9::mark(){
	c_FunctionInfo::mark();
}
String c_R9::debug(){
	String t="(R9)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R10::c_R10(){
}
c_R10* c_R10::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(0)};
	c_FunctionInfo::m_new(String(L"monkey.boxes.UnboxFloat",23),0,bb_reflection__floatClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R10::mark(){
	c_FunctionInfo::mark();
}
String c_R10::debug(){
	String t="(R10)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R11::c_R11(){
}
c_R11* c_R11::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(0)};
	c_FunctionInfo::m_new(String(L"monkey.boxes.UnboxString",24),0,bb_reflection__stringClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R11::mark(){
	c_FunctionInfo::mark();
}
String c_R11::debug(){
	String t="(R11)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R12::c_R12(){
}
c_R12* c_R12::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass};
	c_FunctionInfo::m_new(String(L"monkey.lang.Print",17),1,bb_reflection__intClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R12::mark(){
	c_FunctionInfo::mark();
}
String c_R12::debug(){
	String t="(R12)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R13::c_R13(){
}
c_R13* c_R13::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass};
	c_FunctionInfo::m_new(String(L"monkey.lang.Error",17),1,bb_reflection__intClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R13::mark(){
	c_FunctionInfo::mark();
}
String c_R13::debug(){
	String t="(R13)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R14::c_R14(){
}
c_R14* c_R14::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass};
	c_FunctionInfo::m_new(String(L"monkey.lang.DebugLog",20),1,bb_reflection__intClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R14::mark(){
	c_FunctionInfo::mark();
}
String c_R14::debug(){
	String t="(R14)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R15::c_R15(){
}
c_R15* c_R15::m_new(){
	c_FunctionInfo::m_new(String(L"monkey.lang.DebugStop",21),1,bb_reflection__intClass,Array<c_ClassInfo* >());
	return this;
}
void c_R15::mark(){
	c_FunctionInfo::mark();
}
String c_R15::debug(){
	String t="(R15)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c___GetClass::c___GetClass(){
}
c___GetClass* c___GetClass::m_new(){
	DBG_ENTER("__GetClass.new")
	c___GetClass *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("$SOURCE<745>");
	c__GetClass::m_new();
	return this;
}
c_ClassInfo* c___GetClass::p_GetClass(Object* t_o){
	if(dynamic_cast<c_StringObject*>(t_o)!=0){
		return bb_reflection__classes.At(11);
	}
	if(dynamic_cast<c_FloatObject*>(t_o)!=0){
		return bb_reflection__classes.At(10);
	}
	if(dynamic_cast<c_IntObject*>(t_o)!=0){
		return bb_reflection__classes.At(9);
	}
	if(dynamic_cast<c_BoolObject*>(t_o)!=0){
		return bb_reflection__classes.At(8);
	}
	if(dynamic_cast<c_XMLParseException*>(t_o)!=0){
		return bb_reflection__classes.At(7);
	}
	if(dynamic_cast<c_IllegalArgumentException*>(t_o)!=0){
		return bb_reflection__classes.At(6);
	}
	if(dynamic_cast<c_IndexOutOfBoundsException*>(t_o)!=0){
		return bb_reflection__classes.At(5);
	}
	if(dynamic_cast<c_ConcurrentModificationException*>(t_o)!=0){
		return bb_reflection__classes.At(4);
	}
	if(dynamic_cast<c_AssertException*>(t_o)!=0){
		return bb_reflection__classes.At(3);
	}
	if(dynamic_cast<c_DiddyException*>(t_o)!=0){
		return bb_reflection__classes.At(2);
	}
	if(dynamic_cast<ThrowableObject*>(t_o)!=0){
		return bb_reflection__classes.At(1);
	}
	if(t_o!=0){
		return bb_reflection__classes.At(0);
	}
	return bb_reflection__unknownClass;
}
void c___GetClass::mark(){
	c__GetClass::mark();
}
String c___GetClass::debug(){
	String t="(__GetClass)\n";
	t=c__GetClass::debug()+t;
	return t;
}
int bb_reflection___init(){
	gc_assign(bb_reflection__classes,Array<c_ClassInfo* >(12));
	gc_assign(bb_reflection__classes.At(0),((new c_R16)->m_new()));
	gc_assign(bb_reflection__classes.At(1),((new c_R17)->m_new()));
	gc_assign(bb_reflection__classes.At(2),((new c_R18)->m_new()));
	gc_assign(bb_reflection__classes.At(3),((new c_R31)->m_new()));
	gc_assign(bb_reflection__classes.At(4),((new c_R33)->m_new()));
	gc_assign(bb_reflection__classes.At(5),((new c_R35)->m_new()));
	gc_assign(bb_reflection__classes.At(6),((new c_R37)->m_new()));
	gc_assign(bb_reflection__classes.At(7),((new c_R39)->m_new()));
	gc_assign(bb_reflection__classes.At(8),((new c_R41)->m_new()));
	gc_assign(bb_reflection__classes.At(9),((new c_R47)->m_new()));
	gc_assign(bb_reflection__classes.At(10),((new c_R57)->m_new()));
	gc_assign(bb_reflection__classes.At(11),((new c_R67)->m_new()));
	bb_reflection__classes.At(0)->p_Init();
	bb_reflection__classes.At(1)->p_Init();
	bb_reflection__classes.At(2)->p_Init();
	bb_reflection__classes.At(3)->p_Init();
	bb_reflection__classes.At(4)->p_Init();
	bb_reflection__classes.At(5)->p_Init();
	bb_reflection__classes.At(6)->p_Init();
	bb_reflection__classes.At(7)->p_Init();
	bb_reflection__classes.At(8)->p_Init();
	bb_reflection__classes.At(9)->p_Init();
	bb_reflection__classes.At(10)->p_Init();
	bb_reflection__classes.At(11)->p_Init();
	gc_assign(bb_reflection__functions,Array<c_FunctionInfo* >(12));
	gc_assign(bb_reflection__functions.At(0),((new c_R4)->m_new()));
	gc_assign(bb_reflection__functions.At(1),((new c_R5)->m_new()));
	gc_assign(bb_reflection__functions.At(2),((new c_R6)->m_new()));
	gc_assign(bb_reflection__functions.At(3),((new c_R7)->m_new()));
	gc_assign(bb_reflection__functions.At(4),((new c_R8)->m_new()));
	gc_assign(bb_reflection__functions.At(5),((new c_R9)->m_new()));
	gc_assign(bb_reflection__functions.At(6),((new c_R10)->m_new()));
	gc_assign(bb_reflection__functions.At(7),((new c_R11)->m_new()));
	gc_assign(bb_reflection__functions.At(8),((new c_R12)->m_new()));
	gc_assign(bb_reflection__functions.At(9),((new c_R13)->m_new()));
	gc_assign(bb_reflection__functions.At(10),((new c_R14)->m_new()));
	gc_assign(bb_reflection__functions.At(11),((new c_R15)->m_new()));
	gc_assign(bb_reflection__getClass,((new c___GetClass)->m_new()));
	return 0;
}
int bb_reflection__init;
c_App::c_App(){
}
c_App* c_App::m_new(){
	DBG_ENTER("App.new")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<104>");
	if((bb_app__app)!=0){
		DBG_BLOCK();
		bbError(String(L"App has already been created",28));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<105>");
	gc_assign(bb_app__app,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<106>");
	gc_assign(bb_app__delegate,(new c_GameDelegate)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<107>");
	bb_app__game->SetDelegate(bb_app__delegate);
	return this;
}
int c_App::p_OnCreate(){
	DBG_ENTER("App.OnCreate")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	return 0;
}
int c_App::p_OnSuspend(){
	DBG_ENTER("App.OnSuspend")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	return 0;
}
int c_App::p_OnResume(){
	DBG_ENTER("App.OnResume")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	return 0;
}
int c_App::p_OnUpdate(){
	DBG_ENTER("App.OnUpdate")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	return 0;
}
int c_App::p_OnLoading(){
	DBG_ENTER("App.OnLoading")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	return 0;
}
int c_App::p_OnRender(){
	DBG_ENTER("App.OnRender")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	return 0;
}
int c_App::p_OnClose(){
	DBG_ENTER("App.OnClose")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<129>");
	bb_app_EndApp();
	return 0;
}
int c_App::p_OnBack(){
	DBG_ENTER("App.OnBack")
	c_App *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<133>");
	p_OnClose();
	return 0;
}
void c_App::mark(){
	Object::mark();
}
String c_App::debug(){
	String t="(App)\n";
	return t;
}
c_DiddyApp::c_DiddyApp(){
	m_screens=0;
	m_exitScreen=0;
	m_loadingScreen=0;
	m_screenFade=0;
	m_images=0;
	m_sounds=0;
	m_inputCache=0;
	m_diddyMouse=0;
	m_virtualResOn=true;
	m_aspectRatioOn=false;
	m_aspectRatio=FLOAT(.0);
	m_deviceChanged=0;
	m_mouseX=0;
	m_mouseY=0;
	m_FPS=60;
	m_useFixedRateLogic=false;
	m_frameRate=FLOAT(200.0);
	m_ms=FLOAT(0.0);
	m_numTicks=FLOAT(.0);
	m_lastNumTicks=FLOAT(.0);
	m_lastTime=FLOAT(.0);
	m_multi=FLOAT(.0);
	m_heightBorder=FLOAT(.0);
	m_widthBorder=FLOAT(.0);
	m_vsx=FLOAT(.0);
	m_vsy=FLOAT(.0);
	m_vsw=FLOAT(.0);
	m_vsh=FLOAT(.0);
	m_virtualScaledW=FLOAT(.0);
	m_virtualScaledH=FLOAT(.0);
	m_virtualXOff=FLOAT(.0);
	m_virtualYOff=FLOAT(.0);
	m_autoCls=false;
	m_currentScreen=0;
	m_debugOn=false;
	m_musicFile=String();
	m_musicOkay=0;
	m_musicVolume=100;
	m_mojoMusicVolume=FLOAT(1.0);
	m_soundVolume=100;
	m_drawFPSOn=false;
	m_mouseHit=0;
	m_debugKeyOn=false;
	m_debugKey=112;
	m_tmpMs=FLOAT(.0);
	m_maxMs=50;
	m_nextScreen=0;
	m_scrollX=FLOAT(.0);
	m_scrollY=FLOAT(.0);
}
c_DiddyApp* c_DiddyApp::m_new(){
	DBG_ENTER("DiddyApp.new")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<170>");
	c_App::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<173>");
	gc_assign(bb_framework_diddyGame,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<174>");
	gc_assign(this->m_screens,(new c_Screens)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<175>");
	gc_assign(this->m_exitScreen,(new c_ExitScreen)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<176>");
	gc_assign(this->m_loadingScreen,(new c_LoadingScreen)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<177>");
	gc_assign(this->m_screenFade,(new c_ScreenFade)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<178>");
	gc_assign(this->m_images,(new c_ImageBank)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<179>");
	gc_assign(this->m_sounds,(new c_SoundBank)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<180>");
	gc_assign(this->m_inputCache,(new c_InputCache)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<181>");
	gc_assign(m_diddyMouse,(new c_DiddyMouse)->m_new());
	return this;
}
void c_DiddyApp::p_SetScreenSize(Float t_w,Float t_h,bool t_useAspectRatio){
	DBG_ENTER("DiddyApp.SetScreenSize")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_w,"w")
	DBG_LOCAL(t_h,"h")
	DBG_LOCAL(t_useAspectRatio,"useAspectRatio")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<227>");
	bb_framework_SCREEN_WIDTH=t_w;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<228>");
	bb_framework_SCREEN_HEIGHT=t_h;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<229>");
	bb_framework_SCREEN_WIDTH2=bb_framework_SCREEN_WIDTH/FLOAT(2.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<230>");
	bb_framework_SCREEN_HEIGHT2=bb_framework_SCREEN_HEIGHT/FLOAT(2.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<232>");
	bb_framework_SCREENX_RATIO=bb_framework_DEVICE_WIDTH/bb_framework_SCREEN_WIDTH;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<233>");
	bb_framework_SCREENY_RATIO=bb_framework_DEVICE_HEIGHT/bb_framework_SCREEN_HEIGHT;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<235>");
	if(bb_framework_SCREENX_RATIO!=FLOAT(1.0) || bb_framework_SCREENY_RATIO!=FLOAT(1.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<236>");
		m_virtualResOn=true;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<237>");
		m_aspectRatioOn=t_useAspectRatio;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<238>");
		m_aspectRatio=t_h/t_w;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<240>");
	if(Float(bb_graphics_DeviceWidth())!=bb_framework_SCREEN_WIDTH || Float(bb_graphics_DeviceHeight())!=bb_framework_SCREEN_HEIGHT){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<241>");
		m_deviceChanged=1;
	}
}
void c_DiddyApp::p_ResetFixedRateLogic(){
	DBG_ENTER("DiddyApp.ResetFixedRateLogic")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<494>");
	m_ms=FLOAT(1000.0)/m_frameRate;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<495>");
	m_numTicks=FLOAT(0.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<496>");
	m_lastNumTicks=FLOAT(1.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<497>");
	m_lastTime=Float(bb_app_Millisecs());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<498>");
	if(bb_framework_dt!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<499>");
		bb_framework_dt->m_delta=FLOAT(1.0);
	}
}
void c_DiddyApp::p_Create(){
	DBG_ENTER("DiddyApp.Create")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
}
int c_DiddyApp::p_OnCreate(){
	DBG_ENTER("DiddyApp.OnCreate")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<185>");
	try{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<187>");
		bb_framework_DEVICE_WIDTH=Float(bb_graphics_DeviceWidth());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<188>");
		bb_framework_DEVICE_HEIGHT=Float(bb_graphics_DeviceHeight());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<190>");
		p_SetScreenSize(bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT,false);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<191>");
		m_deviceChanged=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<194>");
		m_mouseX=int(bb_input_MouseX()/bb_framework_SCREENX_RATIO);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<195>");
		m_mouseY=int(bb_input_MouseY()/bb_framework_SCREENY_RATIO);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<198>");
		bb_random_Seed=diddy::systemMillisecs();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<200>");
		gc_assign(bb_framework_dt,(new c_DeltaTimer)->m_new(Float(m_FPS)));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<202>");
		bb_app_SetUpdateRate(m_FPS);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<205>");
		c_Particle::m_Cache();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<208>");
		if(m_useFixedRateLogic){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<209>");
			p_ResetFixedRateLogic();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<213>");
		p_Create();
	}catch(c_DiddyException* t_e){
		DBG_BLOCK();
		DBG_LOCAL(t_e,"e")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<215>");
		bbPrint(t_e->p_ToString(true));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<216>");
		bbError(t_e->p_ToString(false));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<218>");
	return 0;
}
void c_DiddyApp::p_DrawDebug(){
	DBG_ENTER("DiddyApp.DrawDebug")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<400>");
	bb_graphics_SetColor(FLOAT(255.0),FLOAT(255.0),FLOAT(255.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<401>");
	c_FPSCounter::m_Draw(0,0,FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<402>");
	int t_y=10;
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<403>");
	int t_gap=14;
	DBG_LOCAL(t_gap,"gap")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<404>");
	bb_graphics_DrawText(String(L"Screen             = ",21)+m_currentScreen->m_name,FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<405>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<406>");
	bb_graphics_DrawText(String(L"Delta              = ",21)+bb_functions_FormatNumber(bb_framework_dt->m_delta,2,0,0),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<407>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<408>");
	bb_graphics_DrawText(String(L"Frame Time         = ",21)+String(bb_framework_dt->m_frametime),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<409>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<410>");
	bb_graphics_DrawText(String(L"Screen Width       = ",21)+String(bb_framework_SCREEN_WIDTH),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<411>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<412>");
	bb_graphics_DrawText(String(L"Screen Height      = ",21)+String(bb_framework_SCREEN_HEIGHT),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<413>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<414>");
	bb_graphics_DrawText(String(L"VMouseX            = ",21)+String(this->m_mouseX),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<415>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<416>");
	bb_graphics_DrawText(String(L"VMouseY            = ",21)+String(this->m_mouseY),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<417>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<418>");
	bb_graphics_DrawText(String(L"MouseX             = ",21)+String(bb_input_MouseX()),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<419>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<420>");
	bb_graphics_DrawText(String(L"MouseY             = ",21)+String(bb_input_MouseY()),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<421>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<422>");
	bb_graphics_DrawText(String(L"Music File         = ",21)+m_musicFile,FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<423>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<424>");
	bb_graphics_DrawText(String(L"MusicOkay          = ",21)+String(m_musicOkay),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<425>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<426>");
	bb_graphics_DrawText(String(L"Music State        = ",21)+String(bb_audio_MusicState()),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<427>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<428>");
	bb_graphics_DrawText(String(L"Music Volume       = ",21)+String(this->m_musicVolume),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<429>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<430>");
	bb_graphics_DrawText(String(L"Mojo Music Volume  = ",21)+String(this->m_mojoMusicVolume),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<431>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<432>");
	bb_graphics_DrawText(String(L"Sound Volume       = ",21)+String(this->m_soundVolume),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<433>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<434>");
	bb_graphics_DrawText(String(L"Sound Channel      = ",21)+String(c_SoundPlayer::m_channel),FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<435>");
	t_y+=t_gap;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<436>");
	bb_graphics_DrawText(String(L"Back Screen Name   = ",21)+m_currentScreen->m_backScreenName,FLOAT(0.0),Float(t_y),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<437>");
	t_y+=t_gap;
}
void c_DiddyApp::p_DrawFPS(){
	DBG_ENTER("DiddyApp.DrawFPS")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<442>");
	bb_graphics_DrawText(String(c_FPSCounter::m_totalFPS),FLOAT(0.0),FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
}
int c_DiddyApp::p_OnRender(){
	DBG_ENTER("DiddyApp.OnRender")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<246>");
	try{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<247>");
		c_FPSCounter::m_Update();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<248>");
		if(m_virtualResOn){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<249>");
			bb_graphics_PushMatrix();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<250>");
			if(m_aspectRatioOn){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<251>");
				if(Float(bb_graphics_DeviceWidth())!=bb_framework_DEVICE_WIDTH || Float(bb_graphics_DeviceHeight())!=bb_framework_DEVICE_HEIGHT || ((m_deviceChanged)!=0)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<252>");
					bb_framework_DEVICE_WIDTH=Float(bb_graphics_DeviceWidth());
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<253>");
					bb_framework_DEVICE_HEIGHT=Float(bb_graphics_DeviceHeight());
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<254>");
					m_deviceChanged=0;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<256>");
					Float t_deviceRatio=bb_framework_DEVICE_HEIGHT/bb_framework_DEVICE_WIDTH;
					DBG_LOCAL(t_deviceRatio,"deviceRatio")
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<257>");
					if(t_deviceRatio>=m_aspectRatio){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<258>");
						m_multi=bb_framework_DEVICE_WIDTH/bb_framework_SCREEN_WIDTH;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<259>");
						m_heightBorder=(bb_framework_DEVICE_HEIGHT-bb_framework_SCREEN_HEIGHT*m_multi)*FLOAT(0.5);
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<260>");
						m_widthBorder=FLOAT(0.0);
					}else{
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<262>");
						m_multi=bb_framework_DEVICE_HEIGHT/bb_framework_SCREEN_HEIGHT;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<263>");
						m_widthBorder=(bb_framework_DEVICE_WIDTH-bb_framework_SCREEN_WIDTH*m_multi)*FLOAT(0.5);
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<264>");
						m_heightBorder=FLOAT(0.0);
					}
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<267>");
					m_vsx=bb_math_Max2(FLOAT(0.0),m_widthBorder);
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<268>");
					m_vsy=bb_math_Max2(FLOAT(0.0),m_heightBorder);
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<269>");
					m_vsw=bb_math_Min2(bb_framework_DEVICE_WIDTH-m_widthBorder*FLOAT(2.0),bb_framework_DEVICE_WIDTH);
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<270>");
					m_vsh=bb_math_Min2(bb_framework_DEVICE_HEIGHT-m_heightBorder*FLOAT(2.0),bb_framework_DEVICE_HEIGHT);
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<272>");
					m_virtualScaledW=bb_framework_SCREEN_WIDTH*m_multi;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<273>");
					m_virtualScaledH=bb_framework_SCREEN_HEIGHT*m_multi;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<275>");
					m_virtualXOff=(bb_framework_DEVICE_WIDTH-m_virtualScaledW)*FLOAT(0.5);
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<276>");
					m_virtualYOff=(bb_framework_DEVICE_HEIGHT-m_virtualScaledH)*FLOAT(0.5);
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<278>");
					m_virtualXOff=m_virtualXOff/m_multi;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<279>");
					m_virtualYOff=m_virtualYOff/m_multi;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<282>");
				bb_graphics_SetScissor(FLOAT(0.0),FLOAT(0.0),bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<283>");
				bb_graphics_Cls(FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<285>");
				bb_graphics_SetScissor(m_vsx,m_vsy,m_vsw,m_vsh);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<287>");
				bb_graphics_Scale(m_multi,m_multi);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<289>");
				bb_graphics_Translate(m_virtualXOff,m_virtualYOff);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<291>");
				bb_graphics_Scale(bb_framework_SCREENX_RATIO,bb_framework_SCREENY_RATIO);
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<296>");
		if(m_autoCls){
			DBG_BLOCK();
			bb_graphics_Cls(FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<299>");
		m_currentScreen->p_RenderBackgroundLayers();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<300>");
		m_currentScreen->p_Render();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<301>");
		m_currentScreen->p_RenderForegroundLayers();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<303>");
		if(m_virtualResOn){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<304>");
			if(m_aspectRatioOn){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<305>");
				bb_graphics_SetScissor(FLOAT(0.0),FLOAT(0.0),bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<307>");
			bb_graphics_PopMatrix();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<310>");
		m_currentScreen->p_ExtraRender();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<311>");
		if(m_screenFade->m_active){
			DBG_BLOCK();
			m_screenFade->p_Render();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<312>");
		m_currentScreen->p_DebugRender();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<313>");
		if(m_debugOn){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<314>");
			p_DrawDebug();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<316>");
		if(m_drawFPSOn){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<317>");
			p_DrawFPS();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<319>");
		m_diddyMouse->p_Update2();
	}catch(c_DiddyException* t_e){
		DBG_BLOCK();
		DBG_LOCAL(t_e,"e")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<321>");
		bbPrint(t_e->p_ToString(true));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<322>");
		bbError(t_e->p_ToString(false));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<324>");
	return 0;
}
void c_DiddyApp::p_ReadInputs(){
	DBG_ENTER("DiddyApp.ReadInputs")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<328>");
	if(m_aspectRatioOn){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<329>");
		Float t_mouseOffsetX=bb_input_MouseX()-bb_framework_DEVICE_WIDTH*FLOAT(0.5);
		DBG_LOCAL(t_mouseOffsetX,"mouseOffsetX")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<330>");
		Float t_x=t_mouseOffsetX/m_multi/FLOAT(1.0)+bb_framework_SCREEN_WIDTH*FLOAT(0.5);
		DBG_LOCAL(t_x,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<331>");
		m_mouseX=int(t_x);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<332>");
		Float t_mouseOffsetY=bb_input_MouseY()-bb_framework_DEVICE_HEIGHT*FLOAT(0.5);
		DBG_LOCAL(t_mouseOffsetY,"mouseOffsetY")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<333>");
		Float t_y=t_mouseOffsetY/m_multi/FLOAT(1.0)+bb_framework_SCREEN_HEIGHT*FLOAT(0.5);
		DBG_LOCAL(t_y,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<334>");
		m_mouseY=int(t_y);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<336>");
		m_mouseX=int(bb_input_MouseX()/bb_framework_SCREENX_RATIO);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<337>");
		m_mouseY=int(bb_input_MouseY()/bb_framework_SCREENY_RATIO);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<339>");
	m_mouseHit=bb_input_MouseHit(0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<340>");
	m_inputCache->p_ReadInput();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<341>");
	m_inputCache->p_HandleEvents(m_currentScreen);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<343>");
	if(m_debugKeyOn){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<344>");
		if((bb_input_KeyHit(m_debugKey))!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<345>");
			m_debugOn=!m_debugOn;
		}
	}
}
void c_DiddyApp::p_OverrideUpdate(){
	DBG_ENTER("DiddyApp.OverrideUpdate")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
}
void c_DiddyApp::p_SetMojoMusicVolume(Float t_volume){
	DBG_ENTER("DiddyApp.SetMojoMusicVolume")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_volume,"volume")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<464>");
	if(t_volume<FLOAT(0.0)){
		DBG_BLOCK();
		t_volume=FLOAT(0.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<465>");
	if(t_volume>FLOAT(1.0)){
		DBG_BLOCK();
		t_volume=FLOAT(1.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<466>");
	m_mojoMusicVolume=t_volume;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<467>");
	bb_audio_SetMusicVolume(m_mojoMusicVolume);
}
Float c_DiddyApp::p_CalcAnimLength(int t_ms){
	DBG_ENTER("DiddyApp.CalcAnimLength")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_ms,"ms")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<481>");
	Float t_=Float(t_ms)/(FLOAT(1000.0)/Float(m_FPS));
	return t_;
}
void c_DiddyApp::p_MusicPlay(String t_file,int t_flags){
	DBG_ENTER("DiddyApp.MusicPlay")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_file,"file")
	DBG_LOCAL(t_flags,"flags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<447>");
	m_musicFile=t_file;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<449>");
	m_musicOkay=bb_audio_PlayMusic(String(L"music/",6)+m_musicFile,t_flags);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<450>");
	if(m_musicOkay==-1){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<451>");
		bbPrint(String(L"Error Playing Music - Music must be in the data\\music folder",60));
	}
}
void c_DiddyApp::p_Update(Float t_fixedRateLogicDelta){
	DBG_ENTER("DiddyApp.Update")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fixedRateLogicDelta,"fixedRateLogicDelta")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<389>");
	bb_framework_dt->p_UpdateDelta();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<390>");
	if(m_useFixedRateLogic){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<391>");
		bb_framework_dt->m_delta=t_fixedRateLogicDelta;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<394>");
	if(m_screenFade->m_active){
		DBG_BLOCK();
		m_screenFade->p_Update2();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<395>");
	if(!m_screenFade->m_active || m_screenFade->m_allowScreenUpdate){
		DBG_BLOCK();
		m_currentScreen->p_Update2();
	}
}
int c_DiddyApp::p_OnUpdate(){
	DBG_ENTER("DiddyApp.OnUpdate")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<351>");
	try{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<352>");
		p_ReadInputs();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<353>");
		p_OverrideUpdate();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<354>");
		if(m_useFixedRateLogic){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<355>");
			int t_now=bb_app_Millisecs();
			DBG_LOCAL(t_now,"now")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<356>");
			if(Float(t_now)<m_lastTime){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<357>");
				m_numTicks=m_lastNumTicks;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<359>");
				m_tmpMs=Float(t_now)-m_lastTime;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<360>");
				if(m_tmpMs>Float(m_maxMs)){
					DBG_BLOCK();
					m_tmpMs=Float(m_maxMs);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<361>");
				m_numTicks=m_tmpMs/m_ms;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<364>");
			m_lastTime=Float(t_now);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<365>");
			m_lastNumTicks=m_numTicks;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<366>");
			for(int t_i=1;Float(t_i)<=(Float)floor(m_numTicks);t_i=t_i+1){
				DBG_BLOCK();
				DBG_LOCAL(t_i,"i")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<367>");
				p_Update(FLOAT(1.0));
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<370>");
			Float t_re=(Float)fmod(m_numTicks,FLOAT(1.0));
			DBG_LOCAL(t_re,"re")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<371>");
			if(t_re>FLOAT(0.0)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<372>");
				p_Update(t_re);
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<375>");
			p_Update(FLOAT(0.0));
		}
	}catch(c_DiddyException* t_e){
		DBG_BLOCK();
		DBG_LOCAL(t_e,"e")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<378>");
		bbPrint(t_e->p_ToString(true));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<379>");
		bbError(t_e->p_ToString(false));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<382>");
	return 0;
}
int c_DiddyApp::p_OnSuspend(){
	DBG_ENTER("DiddyApp.OnSuspend")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<515>");
	try{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<516>");
		m_currentScreen->p_Suspend();
	}catch(c_DiddyException* t_e){
		DBG_BLOCK();
		DBG_LOCAL(t_e,"e")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<518>");
		bbPrint(t_e->p_ToString(true));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<519>");
		bbError(t_e->p_ToString(false));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<521>");
	return 0;
}
int c_DiddyApp::p_OnResume(){
	DBG_ENTER("DiddyApp.OnResume")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<525>");
	try{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<526>");
		bb_framework_dt->m_currentticks=Float(bb_app_Millisecs());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<527>");
		bb_framework_dt->m_lastticks=bb_framework_dt->m_currentticks;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<528>");
		m_currentScreen->p_Resume();
	}catch(c_DiddyException* t_e){
		DBG_BLOCK();
		DBG_LOCAL(t_e,"e")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<530>");
		bbPrint(t_e->p_ToString(true));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<531>");
		bbError(t_e->p_ToString(false));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<533>");
	return 0;
}
int c_DiddyApp::p_OnBack(){
	DBG_ENTER("DiddyApp.OnBack")
	c_DiddyApp *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<537>");
	try{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<538>");
		m_currentScreen->p_Back();
	}catch(c_DiddyException* t_e){
		DBG_BLOCK();
		DBG_LOCAL(t_e,"e")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<540>");
		bbPrint(t_e->p_ToString(true));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<541>");
		bbError(t_e->p_ToString(false));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<543>");
	return 0;
}
void c_DiddyApp::mark(){
	c_App::mark();
	gc_mark_q(m_screens);
	gc_mark_q(m_exitScreen);
	gc_mark_q(m_loadingScreen);
	gc_mark_q(m_screenFade);
	gc_mark_q(m_images);
	gc_mark_q(m_sounds);
	gc_mark_q(m_inputCache);
	gc_mark_q(m_diddyMouse);
	gc_mark_q(m_currentScreen);
	gc_mark_q(m_nextScreen);
}
String c_DiddyApp::debug(){
	String t="(DiddyApp)\n";
	t=c_App::debug()+t;
	t+=dbg_decl("debugKeyOn",&m_debugKeyOn);
	t+=dbg_decl("debugOn",&m_debugOn);
	t+=dbg_decl("drawFPSOn",&m_drawFPSOn);
	t+=dbg_decl("debugKey",&m_debugKey);
	t+=dbg_decl("virtualResOn",&m_virtualResOn);
	t+=dbg_decl("aspectRatioOn",&m_aspectRatioOn);
	t+=dbg_decl("autoCls",&m_autoCls);
	t+=dbg_decl("aspectRatio",&m_aspectRatio);
	t+=dbg_decl("multi",&m_multi);
	t+=dbg_decl("widthBorder",&m_widthBorder);
	t+=dbg_decl("heightBorder",&m_heightBorder);
	t+=dbg_decl("deviceChanged",&m_deviceChanged);
	t+=dbg_decl("virtualScaledW",&m_virtualScaledW);
	t+=dbg_decl("virtualScaledH",&m_virtualScaledH);
	t+=dbg_decl("virtualXOff",&m_virtualXOff);
	t+=dbg_decl("virtualYOff",&m_virtualYOff);
	t+=dbg_decl("FPS",&m_FPS);
	t+=dbg_decl("currentScreen",&m_currentScreen);
	t+=dbg_decl("nextScreen",&m_nextScreen);
	t+=dbg_decl("exitScreen",&m_exitScreen);
	t+=dbg_decl("loadingScreen",&m_loadingScreen);
	t+=dbg_decl("screenFade",&m_screenFade);
	t+=dbg_decl("scrollX",&m_scrollX);
	t+=dbg_decl("scrollY",&m_scrollY);
	t+=dbg_decl("mouseX",&m_mouseX);
	t+=dbg_decl("mouseY",&m_mouseY);
	t+=dbg_decl("mouseHit",&m_mouseHit);
	t+=dbg_decl("diddyMouse",&m_diddyMouse);
	t+=dbg_decl("images",&m_images);
	t+=dbg_decl("sounds",&m_sounds);
	t+=dbg_decl("screens",&m_screens);
	t+=dbg_decl("musicFile",&m_musicFile);
	t+=dbg_decl("soundVolume",&m_soundVolume);
	t+=dbg_decl("musicVolume",&m_musicVolume);
	t+=dbg_decl("mojoMusicVolume",&m_mojoMusicVolume);
	t+=dbg_decl("musicOkay",&m_musicOkay);
	t+=dbg_decl("inputCache",&m_inputCache);
	t+=dbg_decl("frameRate",&m_frameRate);
	t+=dbg_decl("ms",&m_ms);
	t+=dbg_decl("tmpMs",&m_tmpMs);
	t+=dbg_decl("numTicks",&m_numTicks);
	t+=dbg_decl("lastNumTicks",&m_lastNumTicks);
	t+=dbg_decl("maxMs",&m_maxMs);
	t+=dbg_decl("lastTime",&m_lastTime);
	t+=dbg_decl("useFixedRateLogic",&m_useFixedRateLogic);
	t+=dbg_decl("vsx",&m_vsx);
	t+=dbg_decl("vsy",&m_vsy);
	t+=dbg_decl("vsw",&m_vsw);
	t+=dbg_decl("vsh",&m_vsh);
	return t;
}
c_Game::c_Game(){
}
c_Game* c_Game::m_new(){
	DBG_ENTER("Game.new")
	c_Game *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<9>");
	c_DiddyApp::m_new();
	return this;
}
void c_Game::p_LoadImages(){
	DBG_ENTER("Game.LoadImages")
	c_Game *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<23>");
	c_Image* t_tmpImage=0;
	DBG_LOCAL(t_tmpImage,"tmpImage")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<25>");
	m_images->p_LoadAtlas(String(L"bunny_character.xml",19),0,true,false,0,0,0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<26>");
	m_images->p_LoadAtlas(String(L"hunter_character.xml",20),0,true,false,0,0,0);
}
int c_Game::p_OnCreate(){
	DBG_ENTER("Game.OnCreate")
	c_Game *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<11>");
	c_DiddyApp::p_OnCreate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<13>");
	p_LoadImages();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<15>");
	gc_assign(bb_mainClass_titleScreen,(new c_TitleScreen)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<16>");
	gc_assign(bb_mainClass_gameScreen,(new c_GameScreen)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<17>");
	bb_mainClass_titleScreen->p_PreStart();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<18>");
	return 0;
}
void c_Game::mark(){
	c_DiddyApp::mark();
}
String c_Game::debug(){
	String t="(Game)\n";
	t=c_DiddyApp::debug()+t;
	return t;
}
c_App* bb_app__app;
c_GameDelegate::c_GameDelegate(){
	m__graphics=0;
	m__audio=0;
	m__input=0;
}
c_GameDelegate* c_GameDelegate::m_new(){
	DBG_ENTER("GameDelegate.new")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<24>");
	return this;
}
void c_GameDelegate::StartGame(){
	DBG_ENTER("GameDelegate.StartGame")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<33>");
	gc_assign(m__graphics,(new gxtkGraphics));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<34>");
	bb_graphics_SetGraphicsDevice(m__graphics);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<35>");
	bb_graphics_SetFont(0,32);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<37>");
	gc_assign(m__audio,(new gxtkAudio));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<38>");
	bb_audio_SetAudioDevice(m__audio);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<40>");
	gc_assign(m__input,(new c_InputDevice)->m_new());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<41>");
	bb_input_SetInputDevice(m__input);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<43>");
	bb_app__app->p_OnCreate();
}
void c_GameDelegate::SuspendGame(){
	DBG_ENTER("GameDelegate.SuspendGame")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<47>");
	bb_app__app->p_OnSuspend();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<48>");
	m__audio->Suspend();
}
void c_GameDelegate::ResumeGame(){
	DBG_ENTER("GameDelegate.ResumeGame")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<52>");
	m__audio->Resume();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<53>");
	bb_app__app->p_OnResume();
}
void c_GameDelegate::UpdateGame(){
	DBG_ENTER("GameDelegate.UpdateGame")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<57>");
	m__input->p_BeginUpdate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<58>");
	bb_app__app->p_OnUpdate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<59>");
	m__input->p_EndUpdate();
}
void c_GameDelegate::RenderGame(){
	DBG_ENTER("GameDelegate.RenderGame")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<63>");
	int t_mode=m__graphics->BeginRender();
	DBG_LOCAL(t_mode,"mode")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<64>");
	if((t_mode)!=0){
		DBG_BLOCK();
		bb_graphics_BeginRender();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<65>");
	if(t_mode==2){
		DBG_BLOCK();
		bb_app__app->p_OnLoading();
	}else{
		DBG_BLOCK();
		bb_app__app->p_OnRender();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<66>");
	if((t_mode)!=0){
		DBG_BLOCK();
		bb_graphics_EndRender();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<67>");
	m__graphics->EndRender();
}
void c_GameDelegate::KeyEvent(int t_event,int t_data){
	DBG_ENTER("GameDelegate.KeyEvent")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<71>");
	m__input->p_KeyEvent(t_event,t_data);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<72>");
	if(t_event!=1){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<73>");
	int t_1=t_data;
	DBG_LOCAL(t_1,"1")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<74>");
	if(t_1==432){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<75>");
		bb_app__app->p_OnClose();
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<76>");
		if(t_1==416){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<77>");
			bb_app__app->p_OnBack();
		}
	}
}
void c_GameDelegate::MouseEvent(int t_event,int t_data,Float t_x,Float t_y){
	DBG_ENTER("GameDelegate.MouseEvent")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<82>");
	m__input->p_MouseEvent(t_event,t_data,t_x,t_y);
}
void c_GameDelegate::TouchEvent(int t_event,int t_data,Float t_x,Float t_y){
	DBG_ENTER("GameDelegate.TouchEvent")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<86>");
	m__input->p_TouchEvent(t_event,t_data,t_x,t_y);
}
void c_GameDelegate::MotionEvent(int t_event,int t_data,Float t_x,Float t_y,Float t_z){
	DBG_ENTER("GameDelegate.MotionEvent")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_z,"z")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<90>");
	m__input->p_MotionEvent(t_event,t_data,t_x,t_y,t_z);
}
void c_GameDelegate::DiscardGraphics(){
	DBG_ENTER("GameDelegate.DiscardGraphics")
	c_GameDelegate *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<94>");
	m__graphics->DiscardGraphics();
}
void c_GameDelegate::mark(){
	BBGameDelegate::mark();
	gc_mark_q(m__graphics);
	gc_mark_q(m__audio);
	gc_mark_q(m__input);
}
String c_GameDelegate::debug(){
	String t="(GameDelegate)\n";
	t+=dbg_decl("_graphics",&m__graphics);
	t+=dbg_decl("_audio",&m__audio);
	t+=dbg_decl("_input",&m__input);
	return t;
}
c_GameDelegate* bb_app__delegate;
BBGame* bb_app__game;
c_DiddyApp* bb_framework_diddyGame;
c_Screen::c_Screen(){
	m_name=String();
	m_layers=0;
	m_backScreenName=String();
	m_autoFadeIn=false;
	m_autoFadeInTime=FLOAT(50.0);
	m_autoFadeInSound=false;
	m_autoFadeInMusic=false;
	m_musicPath=String();
	m_musicFlag=0;
}
c_Screen* c_Screen::m_new(String t_name){
	DBG_ENTER("Screen.new")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<768>");
	this->m_name=t_name;
	return this;
}
void c_Screen::p_RenderBackgroundLayers(){
	DBG_ENTER("Screen.RenderBackgroundLayers")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<807>");
	if((m_layers)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<808>");
		c_IEnumerator* t_=m_layers->p_ObjectEnumerator();
		while(t_->p_HasNext()){
			DBG_BLOCK();
			c_DiddyDataLayer* t_layer=t_->p_NextObject();
			DBG_LOCAL(t_layer,"layer")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<809>");
			if(t_layer->m_index>=0){
				DBG_BLOCK();
				return;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<810>");
			t_layer->p_Render2(FLOAT(0.0),FLOAT(0.0));
		}
	}
}
void c_Screen::p_RenderForegroundLayers(){
	DBG_ENTER("Screen.RenderForegroundLayers")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<816>");
	if((m_layers)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<817>");
		c_IEnumerator* t_=m_layers->p_ObjectEnumerator();
		while(t_->p_HasNext()){
			DBG_BLOCK();
			c_DiddyDataLayer* t_layer=t_->p_NextObject();
			DBG_LOCAL(t_layer,"layer")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<818>");
			if(t_layer->m_index>=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<819>");
				t_layer->p_Render2(FLOAT(0.0),FLOAT(0.0));
			}
		}
	}
}
void c_Screen::p_ExtraRender(){
	DBG_ENTER("Screen.ExtraRender")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_DebugRender(){
	DBG_ENTER("Screen.DebugRender")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnTouchHit(int t_x,int t_y,int t_pointer){
	DBG_ENTER("Screen.OnTouchHit")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnTouchClick(int t_x,int t_y,int t_pointer){
	DBG_ENTER("Screen.OnTouchClick")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnTouchFling(int t_releaseX,int t_releaseY,Float t_velocityX,Float t_velocityY,Float t_velocitySpeed,int t_pointer){
	DBG_ENTER("Screen.OnTouchFling")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnTouchReleased(int t_x,int t_y,int t_pointer){
	DBG_ENTER("Screen.OnTouchReleased")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnTouchDragged(int t_x,int t_y,int t_dx,int t_dy,int t_pointer){
	DBG_ENTER("Screen.OnTouchDragged")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnTouchLongPress(int t_x,int t_y,int t_pointer){
	DBG_ENTER("Screen.OnTouchLongPress")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnAnyKeyHit(){
	DBG_ENTER("Screen.OnAnyKeyHit")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnKeyHit(int t_key){
	DBG_ENTER("Screen.OnKeyHit")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnAnyKeyDown(){
	DBG_ENTER("Screen.OnAnyKeyDown")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnKeyDown(int t_key){
	DBG_ENTER("Screen.OnKeyDown")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnAnyKeyReleased(){
	DBG_ENTER("Screen.OnAnyKeyReleased")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnKeyReleased(int t_key){
	DBG_ENTER("Screen.OnKeyReleased")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnMouseHit(int t_x,int t_y,int t_button){
	DBG_ENTER("Screen.OnMouseHit")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnMouseDown(int t_x,int t_y,int t_button){
	DBG_ENTER("Screen.OnMouseDown")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_OnMouseReleased(int t_x,int t_y,int t_button){
	DBG_ENTER("Screen.OnMouseReleased")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_Kill(){
	DBG_ENTER("Screen.Kill")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_PreStart(){
	DBG_ENTER("Screen.PreStart")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<772>");
	bb_framework_diddyGame->m_screens->p_Set2(m_name,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<773>");
	gc_assign(bb_framework_diddyGame->m_currentScreen,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<774>");
	if(m_autoFadeIn){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<775>");
		m_autoFadeIn=false;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<776>");
		bb_framework_diddyGame->m_screenFade->p_Start2(m_autoFadeInTime,false,m_autoFadeInSound,m_autoFadeInMusic,true);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<780>");
	c_Image* t_tmpImage=0;
	DBG_LOCAL(t_tmpImage,"tmpImage")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<781>");
	c_KeyEnumerator* t_=bb_framework_diddyGame->m_images->p_Keys()->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		String t_key=t_->p_NextObject();
		DBG_LOCAL(t_key,"key")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<782>");
		c_GameImage* t_i=bb_framework_diddyGame->m_images->p_Get(t_key);
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<783>");
		if(t_i->m_preLoad && t_i->m_screenName.ToUpper()==m_name.ToUpper()){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<784>");
			if(t_i->m_frames>1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<785>");
				t_i->p_LoadAnim(t_i->m_path,t_i->m_w,t_i->m_h,t_i->m_frames,t_tmpImage,t_i->m_midhandle,t_i->m_readPixels,t_i->m_maskRed,t_i->m_maskGreen,t_i->m_maskBlue,false,t_i->m_screenName);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<787>");
				t_i->p_Load(t_i->m_path,t_i->m_midhandle,t_i->m_readPixels,t_i->m_maskRed,t_i->m_maskGreen,t_i->m_maskBlue,false,t_i->m_screenName);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<793>");
	c_KeyEnumerator2* t_2=bb_framework_diddyGame->m_sounds->p_Keys()->p_ObjectEnumerator();
	while(t_2->p_HasNext()){
		DBG_BLOCK();
		String t_key2=t_2->p_NextObject();
		DBG_LOCAL(t_key2,"key")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<794>");
		c_GameSound* t_i2=bb_framework_diddyGame->m_sounds->p_Get(t_key2);
		DBG_LOCAL(t_i2,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<795>");
		if(t_i2->m_preLoad && t_i2->m_screenName.ToUpper()==m_name.ToUpper()){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<796>");
			t_i2->p_Load2(t_i2->m_path,false,t_i2->m_screenName);
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<801>");
	if(m_musicPath!=String()){
		DBG_BLOCK();
		bb_framework_diddyGame->p_MusicPlay(m_musicPath,m_musicFlag);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<803>");
	p_Start();
}
void c_Screen::p_PostFadeOut(){
	DBG_ENTER("Screen.PostFadeOut")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<847>");
	p_Kill();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<848>");
	bb_framework_diddyGame->m_nextScreen->p_PreStart();
}
void c_Screen::p_PostFadeIn(){
	DBG_ENTER("Screen.PostFadeIn")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_Suspend(){
	DBG_ENTER("Screen.Suspend")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_Resume(){
	DBG_ENTER("Screen.Resume")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_Screen::p_FadeToScreen(c_Screen* t_screen,Float t_fadeTime,bool t_fadeSound,bool t_fadeMusic,bool t_allowScreenUpdate){
	DBG_ENTER("Screen.FadeToScreen")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_screen,"screen")
	DBG_LOCAL(t_fadeTime,"fadeTime")
	DBG_LOCAL(t_fadeSound,"fadeSound")
	DBG_LOCAL(t_fadeMusic,"fadeMusic")
	DBG_LOCAL(t_allowScreenUpdate,"allowScreenUpdate")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<926>");
	if(bb_framework_diddyGame->m_screenFade->m_active){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<929>");
	if(!((t_screen)!=0)){
		DBG_BLOCK();
		t_screen=(bb_framework_diddyGame->m_exitScreen);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<932>");
	t_screen->m_autoFadeIn=true;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<933>");
	t_screen->m_autoFadeInTime=t_fadeTime;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<934>");
	t_screen->m_autoFadeInSound=t_fadeSound;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<935>");
	t_screen->m_autoFadeInMusic=t_fadeMusic;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<938>");
	gc_assign(bb_framework_diddyGame->m_nextScreen,t_screen);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<939>");
	bb_framework_diddyGame->m_screenFade->p_Start2(t_fadeTime,true,t_fadeSound,t_fadeMusic,t_allowScreenUpdate);
}
void c_Screen::p_Back(){
	DBG_ENTER("Screen.Back")
	c_Screen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<832>");
	if(m_backScreenName==String(L"exit",4)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<833>");
		p_FadeToScreen(0,bb_framework_defaultFadeTime,false,false,true);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<834>");
		if((m_backScreenName).Length()!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<835>");
			c_Screen* t_scr=bb_framework_diddyGame->m_screens->p_Find(m_backScreenName);
			DBG_LOCAL(t_scr,"scr")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<836>");
			if((t_scr)!=0){
				DBG_BLOCK();
				p_FadeToScreen(t_scr,bb_framework_defaultFadeTime,false,false,true);
			}
		}
	}
}
void c_Screen::mark(){
	Object::mark();
	gc_mark_q(m_layers);
}
String c_Screen::debug(){
	String t="(Screen)\n";
	t+=dbg_decl("autoFadeIn",&m_autoFadeIn);
	t+=dbg_decl("autoFadeInTime",&m_autoFadeInTime);
	t+=dbg_decl("autoFadeInSound",&m_autoFadeInSound);
	t+=dbg_decl("autoFadeInMusic",&m_autoFadeInMusic);
	t+=dbg_decl("musicPath",&m_musicPath);
	t+=dbg_decl("musicFlag",&m_musicFlag);
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("backScreenName",&m_backScreenName);
	t+=dbg_decl("layers",&m_layers);
	return t;
}
c_Map2::c_Map2(){
	m_root=0;
}
c_Map2* c_Map2::m_new(){
	DBG_ENTER("Map.new")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>");
	return this;
}
int c_Map2::p_RotateLeft2(c_Node3* t_node){
	DBG_ENTER("Map.RotateLeft")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>");
	c_Node3* t_child=t_node->m_right;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>");
	gc_assign(t_node->m_right,t_child->m_left);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>");
	if((t_child->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>");
		gc_assign(t_child->m_left->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>");
		if(t_node==t_node->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>");
	gc_assign(t_child->m_left,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map2::p_RotateRight2(c_Node3* t_node){
	DBG_ENTER("Map.RotateRight")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>");
	c_Node3* t_child=t_node->m_left;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>");
	gc_assign(t_node->m_left,t_child->m_right);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>");
	if((t_child->m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>");
		gc_assign(t_child->m_right->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>");
		if(t_node==t_node->m_parent->m_right){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>");
	gc_assign(t_child->m_right,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map2::p_InsertFixup2(c_Node3* t_node){
	DBG_ENTER("Map.InsertFixup")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>");
	while(((t_node->m_parent)!=0) && t_node->m_parent->m_color==-1 && ((t_node->m_parent->m_parent)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>");
		if(t_node->m_parent==t_node->m_parent->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>");
			c_Node3* t_uncle=t_node->m_parent->m_parent->m_right;
			DBG_LOCAL(t_uncle,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>");
			if(((t_uncle)!=0) && t_uncle->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>");
				t_uncle->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>");
				t_uncle->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>");
				t_node=t_uncle->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>");
				if(t_node==t_node->m_parent->m_right){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>");
					p_RotateLeft2(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>");
				p_RotateRight2(t_node->m_parent->m_parent);
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>");
			c_Node3* t_uncle2=t_node->m_parent->m_parent->m_left;
			DBG_LOCAL(t_uncle2,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>");
			if(((t_uncle2)!=0) && t_uncle2->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>");
				t_uncle2->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>");
				t_uncle2->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>");
				t_node=t_uncle2->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>");
				if(t_node==t_node->m_parent->m_left){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>");
					p_RotateRight2(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>");
				p_RotateLeft2(t_node->m_parent->m_parent);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>");
	m_root->m_color=1;
	return 0;
}
bool c_Map2::p_Set2(String t_key,c_Screen* t_value){
	DBG_ENTER("Map.Set")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>");
	c_Node3* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>");
	c_Node3* t_parent=0;
	int t_cmp=0;
	DBG_LOCAL(t_parent,"parent")
	DBG_LOCAL(t_cmp,"cmp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>");
		t_parent=t_node;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>");
		t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>");
				gc_assign(t_node->m_value,t_value);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>");
				return false;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>");
	t_node=(new c_Node3)->m_new(t_key,t_value,-1,t_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>");
	if((t_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>");
			gc_assign(t_parent->m_right,t_node);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>");
			gc_assign(t_parent->m_left,t_node);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>");
		p_InsertFixup2(t_node);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>");
		gc_assign(m_root,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>");
	return true;
}
c_MapKeys3* c_Map2::p_Keys(){
	DBG_ENTER("Map.Keys")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>");
	c_MapKeys3* t_=(new c_MapKeys3)->m_new(this);
	return t_;
}
c_Node3* c_Map2::p_FirstNode(){
	DBG_ENTER("Map.FirstNode")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>");
	if(!((m_root)!=0)){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>");
	c_Node3* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>");
	while((t_node->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>");
		t_node=t_node->m_left;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>");
	return t_node;
}
c_Node3* c_Map2::p_FindNode(String t_key){
	DBG_ENTER("Map.FindNode")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>");
	c_Node3* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>");
		int t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_LOCAL(t_cmp,"cmp")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>");
				return t_node;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>");
	return t_node;
}
c_Screen* c_Map2::p_Get(String t_key){
	DBG_ENTER("Map.Get")
	c_Map2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>");
	c_Node3* t_node=p_FindNode(t_key);
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>");
	if((t_node)!=0){
		DBG_BLOCK();
		return t_node->m_value;
	}
	return 0;
}
void c_Map2::mark(){
	Object::mark();
	gc_mark_q(m_root);
}
String c_Map2::debug(){
	String t="(Map)\n";
	t+=dbg_decl("root",&m_root);
	return t;
}
c_StringMap2::c_StringMap2(){
}
c_StringMap2* c_StringMap2::m_new(){
	DBG_ENTER("StringMap.new")
	c_StringMap2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>");
	c_Map2::m_new();
	return this;
}
int c_StringMap2::p_Compare(String t_lhs,String t_rhs){
	DBG_ENTER("StringMap.Compare")
	c_StringMap2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>");
	int t_=t_lhs.Compare(t_rhs);
	return t_;
}
void c_StringMap2::mark(){
	c_Map2::mark();
}
String c_StringMap2::debug(){
	String t="(StringMap)\n";
	t=c_Map2::debug()+t;
	return t;
}
c_Screens::c_Screens(){
}
c_Screens* c_Screens::m_new(){
	DBG_ENTER("Screens.new")
	c_Screens *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<555>");
	c_StringMap2::m_new();
	return this;
}
bool c_Screens::p_Set2(String t_key,c_Screen* t_value){
	DBG_ENTER("Screens.Set")
	c_Screens *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<557>");
	bool t_=c_Map2::p_Set2(t_key.ToUpper(),t_value);
	return t_;
}
c_Screen* c_Screens::p_Find(String t_name){
	DBG_ENTER("Screens.Find")
	c_Screens *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<561>");
	t_name=t_name.ToUpper();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<564>");
	if(bb_framework_diddyGame->m_debugOn){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<565>");
		c_KeyEnumerator3* t_=this->p_Keys()->p_ObjectEnumerator();
		while(t_->p_HasNext()){
			DBG_BLOCK();
			String t_key=t_->p_NextObject();
			DBG_LOCAL(t_key,"key")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<566>");
			bbPrint(t_key+String(L" is stored in the Screens map.",30));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<570>");
	c_Screen* t_i=this->p_Get(t_name);
	DBG_LOCAL(t_i,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<571>");
	bb_assert_AssertNotNull((t_i),String(L"Screen '",8)+t_name+String(L"' not found in the Screens map",30));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<572>");
	return t_i;
}
void c_Screens::mark(){
	c_StringMap2::mark();
}
String c_Screens::debug(){
	String t="(Screens)\n";
	t=c_StringMap2::debug()+t;
	return t;
}
c_ExitScreen::c_ExitScreen(){
}
c_ExitScreen* c_ExitScreen::m_new(){
	DBG_ENTER("ExitScreen.new")
	c_ExitScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<734>");
	c_Screen::m_new(String(L"exit",4));
	return this;
}
void c_ExitScreen::p_Start(){
	DBG_ENTER("ExitScreen.Start")
	c_ExitScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<738>");
	bb_functions_ExitApp();
}
void c_ExitScreen::p_Render(){
	DBG_ENTER("ExitScreen.Render")
	c_ExitScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<742>");
	bb_graphics_Cls(FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
}
void c_ExitScreen::p_Update2(){
	DBG_ENTER("ExitScreen.Update")
	c_ExitScreen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_ExitScreen::mark(){
	c_Screen::mark();
}
String c_ExitScreen::debug(){
	String t="(ExitScreen)\n";
	t=c_Screen::debug()+t;
	return t;
}
c_LoadingScreen::c_LoadingScreen(){
	m_loadingBar=0;
	m_finished=false;
	m_destination=0;
	m_image=0;
}
c_LoadingScreen* c_LoadingScreen::m_new(){
	DBG_ENTER("LoadingScreen.new")
	c_LoadingScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<694>");
	c_Screen::m_new(String());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<695>");
	m_name=String(L"loading",7);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<696>");
	gc_assign(m_loadingBar,(new c_LoadingBar)->m_new());
	return this;
}
void c_LoadingScreen::p_Start(){
	DBG_ENTER("LoadingScreen.Start")
	c_LoadingScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<711>");
	m_finished=false;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<712>");
	if(m_destination==0){
		DBG_BLOCK();
		bbError(String(L"Loading Screen Destination is null!",35));
	}
}
void c_LoadingScreen::p_Render(){
	DBG_ENTER("LoadingScreen.Render")
	c_LoadingScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<716>");
	bb_graphics_Cls(FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<717>");
	bb_graphics_DrawImage(m_image,bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2,0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<718>");
	m_loadingBar->p_Draw();
}
void c_LoadingScreen::p_Update2(){
	DBG_ENTER("LoadingScreen.Update")
	c_LoadingScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<722>");
	if((bb_input_KeyHit(32))!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<723>");
		m_loadingBar->p_Progress();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<725>");
	if(m_loadingBar->m_finished){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<726>");
		p_FadeToScreen(m_destination,bb_framework_defaultFadeTime,false,false,true);
	}
}
void c_LoadingScreen::mark(){
	c_Screen::mark();
	gc_mark_q(m_loadingBar);
	gc_mark_q(m_destination);
	gc_mark_q(m_image);
}
String c_LoadingScreen::debug(){
	String t="(LoadingScreen)\n";
	t=c_Screen::debug()+t;
	t+=dbg_decl("finished",&m_finished);
	t+=dbg_decl("destination",&m_destination);
	t+=dbg_decl("loadingBar",&m_loadingBar);
	t+=dbg_decl("image",&m_image);
	return t;
}
c_LoadingBar::c_LoadingBar(){
	m_emptyImage=0;
	m_x=0;
	m_y=0;
	m_fullImage=0;
	m_position=FLOAT(.0);
	m_currentStep=0;
	m_stepSize=FLOAT(.0);
	m_steps=FLOAT(.0);
	m_finished=false;
}
c_LoadingBar* c_LoadingBar::m_new(){
	DBG_ENTER("LoadingBar.new")
	c_LoadingBar *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<659>");
	return this;
}
void c_LoadingBar::p_Draw(){
	DBG_ENTER("LoadingBar.Draw")
	c_LoadingBar *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<682>");
	bb_graphics_DrawImage(m_emptyImage,Float(m_x),Float(m_y),0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<683>");
	bb_graphics_DrawImageRect(m_fullImage,Float(m_x),Float(m_y),0,0,int(m_position),m_fullImage->p_Height(),0);
}
void c_LoadingBar::p_Progress(){
	DBG_ENTER("LoadingBar.Progress")
	c_LoadingBar *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<675>");
	m_currentStep=m_currentStep+1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<676>");
	m_position=Float(m_currentStep)*m_stepSize;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<677>");
	if(m_position>Float(m_fullImage->p_Width())){
		DBG_BLOCK();
		m_position=Float(m_fullImage->p_Width());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<678>");
	if(Float(m_currentStep)==m_steps){
		DBG_BLOCK();
		m_finished=true;
	}
}
void c_LoadingBar::mark(){
	Object::mark();
	gc_mark_q(m_emptyImage);
	gc_mark_q(m_fullImage);
}
String c_LoadingBar::debug(){
	String t="(LoadingBar)\n";
	t+=dbg_decl("fullImage",&m_fullImage);
	t+=dbg_decl("emptyImage",&m_emptyImage);
	t+=dbg_decl("x",&m_x);
	t+=dbg_decl("y",&m_y);
	t+=dbg_decl("steps",&m_steps);
	t+=dbg_decl("stepSize",&m_stepSize);
	t+=dbg_decl("finished",&m_finished);
	t+=dbg_decl("position",&m_position);
	t+=dbg_decl("currentStep",&m_currentStep);
	return t;
}
c_ScreenFade::c_ScreenFade(){
	m_active=false;
	m_ratio=FLOAT(0.0);
	m_counter=FLOAT(.0);
	m_fadeTime=FLOAT(.0);
	m_fadeMusic=false;
	m_fadeOut=false;
	m_fadeSound=false;
	m_allowScreenUpdate=false;
}
c_ScreenFade* c_ScreenFade::m_new(){
	DBG_ENTER("ScreenFade.new")
	c_ScreenFade *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<577>");
	return this;
}
void c_ScreenFade::p_Render(){
	DBG_ENTER("ScreenFade.Render")
	c_ScreenFade *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<649>");
	if(!m_active){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<650>");
	bb_graphics_SetAlpha(FLOAT(1.0)-m_ratio);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<651>");
	bb_graphics_SetColor(FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<652>");
	bb_graphics_DrawRect(FLOAT(0.0),FLOAT(0.0),bb_framework_DEVICE_WIDTH,bb_framework_DEVICE_HEIGHT);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<653>");
	bb_graphics_SetAlpha(FLOAT(1.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<654>");
	bb_graphics_SetColor(FLOAT(255.0),FLOAT(255.0),FLOAT(255.0));
}
void c_ScreenFade::p_CalcRatio(){
	DBG_ENTER("ScreenFade.CalcRatio")
	c_ScreenFade *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<630>");
	m_ratio=m_counter/m_fadeTime;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<631>");
	if(m_ratio<FLOAT(0.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<632>");
		m_ratio=FLOAT(0.0);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<633>");
		if(m_fadeMusic){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<634>");
			bb_framework_diddyGame->p_SetMojoMusicVolume(FLOAT(0.0));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<637>");
	if(m_ratio>FLOAT(1.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<638>");
		m_ratio=FLOAT(1.0);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<639>");
		if(m_fadeMusic){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<640>");
			bb_framework_diddyGame->p_SetMojoMusicVolume(Float(bb_framework_diddyGame->m_musicVolume)/FLOAT(100.0));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<643>");
	if(m_fadeOut){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<644>");
		m_ratio=FLOAT(1.0)-m_ratio;
	}
}
void c_ScreenFade::p_Start2(Float t_fadeTime,bool t_fadeOut,bool t_fadeSound,bool t_fadeMusic,bool t_allowScreenUpdate){
	DBG_ENTER("ScreenFade.Start")
	c_ScreenFade *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fadeTime,"fadeTime")
	DBG_LOCAL(t_fadeOut,"fadeOut")
	DBG_LOCAL(t_fadeSound,"fadeSound")
	DBG_LOCAL(t_fadeMusic,"fadeMusic")
	DBG_LOCAL(t_allowScreenUpdate,"allowScreenUpdate")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<588>");
	if(m_active){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<589>");
	m_active=true;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<590>");
	this->m_fadeTime=bb_framework_diddyGame->p_CalcAnimLength(int(t_fadeTime));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<591>");
	this->m_fadeOut=t_fadeOut;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<592>");
	this->m_fadeMusic=t_fadeMusic;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<593>");
	this->m_fadeSound=t_fadeSound;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<594>");
	this->m_allowScreenUpdate=t_allowScreenUpdate;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<595>");
	if(t_fadeOut){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<596>");
		m_ratio=FLOAT(1.0);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<598>");
		m_ratio=FLOAT(0.0);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<600>");
		if(this->m_fadeMusic){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<601>");
			bb_framework_diddyGame->p_SetMojoMusicVolume(FLOAT(0.0));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<604>");
	m_counter=FLOAT(0.0);
}
void c_ScreenFade::p_Update2(){
	DBG_ENTER("ScreenFade.Update")
	c_ScreenFade *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<608>");
	if(!m_active){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<609>");
	m_counter+=bb_framework_dt->m_delta;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<610>");
	p_CalcRatio();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<611>");
	if(m_fadeSound){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<612>");
		for(int t_i=0;t_i<=31;t_i=t_i+1){
			DBG_BLOCK();
			DBG_LOCAL(t_i,"i")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<613>");
			bb_audio_SetChannelVolume(t_i,m_ratio*(Float(bb_framework_diddyGame->m_soundVolume)/FLOAT(100.0)));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<616>");
	if(m_fadeMusic){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<617>");
		bb_framework_diddyGame->p_SetMojoMusicVolume(m_ratio*(Float(bb_framework_diddyGame->m_musicVolume)/FLOAT(100.0)));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<619>");
	if(m_counter>m_fadeTime){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<620>");
		m_active=false;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<621>");
		if(m_fadeOut){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<622>");
			bb_framework_diddyGame->m_currentScreen->p_PostFadeOut();
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<624>");
			bb_framework_diddyGame->m_currentScreen->p_PostFadeIn();
		}
	}
}
void c_ScreenFade::mark(){
	Object::mark();
}
String c_ScreenFade::debug(){
	String t="(ScreenFade)\n";
	t+=dbg_decl("fadeTime",&m_fadeTime);
	t+=dbg_decl("fadeOut",&m_fadeOut);
	t+=dbg_decl("ratio",&m_ratio);
	t+=dbg_decl("active",&m_active);
	t+=dbg_decl("counter",&m_counter);
	t+=dbg_decl("fadeMusic",&m_fadeMusic);
	t+=dbg_decl("fadeSound",&m_fadeSound);
	t+=dbg_decl("allowScreenUpdate",&m_allowScreenUpdate);
	return t;
}
c_GameImage::c_GameImage(){
	m_image=0;
	m_w=0;
	m_h=0;
	m_preLoad=false;
	m_screenName=String();
	m_frames=0;
	m_path=String();
	m_midhandle=false;
	m_readPixels=false;
	m_maskRed=0;
	m_maskGreen=0;
	m_maskBlue=0;
	m_name=String();
	m_w2=FLOAT(.0);
	m_h2=FLOAT(.0);
	m_midhandled=0;
	m_pixels=Array<int >();
	m_atlasName=String();
	m_subX=0;
	m_subY=0;
	m_tileMargin=0;
	m_tileWidth=0;
	m_tileSpacing=0;
	m_tileCountX=0;
	m_tileHeight=0;
	m_tileCountY=0;
	m_tileCount=0;
}
void c_GameImage::p_Draw2(Float t_x,Float t_y,Float t_rotation,Float t_scaleX,Float t_scaleY,int t_frame){
	DBG_ENTER("GameImage.Draw")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_rotation,"rotation")
	DBG_LOCAL(t_scaleX,"scaleX")
	DBG_LOCAL(t_scaleY,"scaleY")
	DBG_LOCAL(t_frame,"frame")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1448>");
	bb_graphics_DrawImage2(this->m_image,t_x,t_y,t_rotation,t_scaleX,t_scaleY,t_frame);
}
void c_GameImage::p_CalcSize(){
	DBG_ENTER("GameImage.CalcSize")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1421>");
	if(m_image!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1422>");
		m_w=m_image->p_Width();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1423>");
		m_h=m_image->p_Height();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1424>");
		m_w2=Float(m_w/2);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1425>");
		m_h2=Float(m_h/2);
	}
}
void c_GameImage::p_MidHandle(bool t_midhandle){
	DBG_ENTER("GameImage.MidHandle")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_midhandle,"midhandle")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1430>");
	if(t_midhandle){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1431>");
		m_image->p_SetHandle(m_w2,m_h2);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1432>");
		this->m_midhandled=1;
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1434>");
		m_image->p_SetHandle(FLOAT(0.0),FLOAT(0.0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1435>");
		this->m_midhandled=0;
	}
}
bool c_GameImage::p_MidHandle2(){
	DBG_ENTER("GameImage.MidHandle")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1444>");
	bool t_=this->m_midhandled==1;
	return t_;
}
void c_GameImage::p_SetMaskColor(int t_r,int t_g,int t_b){
	DBG_ENTER("GameImage.SetMaskColor")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_r,"r")
	DBG_LOCAL(t_g,"g")
	DBG_LOCAL(t_b,"b")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1366>");
	m_maskRed=t_r;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1367>");
	m_maskGreen=t_g;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1368>");
	m_maskBlue=t_b;
}
void c_GameImage::p_LoadAnim(String t_file,int t_w,int t_h,int t_total,c_Image* t_tmpImage,bool t_midhandle,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue,bool t_preLoad,String t_screenName){
	DBG_ENTER("GameImage.LoadAnim")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_file,"file")
	DBG_LOCAL(t_w,"w")
	DBG_LOCAL(t_h,"h")
	DBG_LOCAL(t_total,"total")
	DBG_LOCAL(t_tmpImage,"tmpImage")
	DBG_LOCAL(t_midhandle,"midhandle")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_LOCAL(t_preLoad,"preLoad")
	DBG_LOCAL(t_screenName,"screenName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1388>");
	m_name=bb_functions_StripAll(t_file.ToUpper());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1389>");
	m_path=t_file;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1390>");
	this->m_midhandle=t_midhandle;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1391>");
	this->m_preLoad=t_preLoad;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1392>");
	this->m_screenName=t_screenName.ToUpper();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1393>");
	this->m_w=t_w;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1394>");
	this->m_h=t_h;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1395>");
	this->m_frames=t_total;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1396>");
	if(!t_preLoad){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1397>");
		gc_assign(m_image,bb_functions_LoadAnimBitmap(t_file,t_w,t_h,t_total,t_tmpImage));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1398>");
		p_CalcSize();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1399>");
		p_MidHandle(t_midhandle);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1400>");
		gc_assign(m_pixels,Array<int >(m_image->p_Width()*m_image->p_Height()));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1401>");
		this->m_readPixels=t_readPixels;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1403>");
	p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
}
void c_GameImage::p_Load(String t_file,bool t_midhandle,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue,bool t_preLoad,String t_screenName){
	DBG_ENTER("GameImage.Load")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_file,"file")
	DBG_LOCAL(t_midhandle,"midhandle")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_LOCAL(t_preLoad,"preLoad")
	DBG_LOCAL(t_screenName,"screenName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1372>");
	m_name=bb_functions_StripAll(t_file.ToUpper());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1373>");
	m_path=t_file;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1374>");
	this->m_midhandle=t_midhandle;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1375>");
	this->m_preLoad=t_preLoad;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1376>");
	this->m_screenName=t_screenName.ToUpper();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1377>");
	if(!t_preLoad){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1378>");
		gc_assign(m_image,bb_functions_LoadBitmap(t_file,0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1379>");
		p_CalcSize();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1380>");
		p_MidHandle(t_midhandle);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1381>");
		gc_assign(m_pixels,Array<int >(m_image->p_Width()*m_image->p_Height()));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1382>");
		this->m_readPixels=t_readPixels;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1384>");
	p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
}
c_GameImage* c_GameImage::m_new(){
	DBG_ENTER("GameImage.new")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1316>");
	return this;
}
void c_GameImage::p_DrawTile(Float t_x,Float t_y,int t_tile,Float t_rotation,Float t_scaleX,Float t_scaleY){
	DBG_ENTER("GameImage.DrawTile")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_tile,"tile")
	DBG_LOCAL(t_rotation,"rotation")
	DBG_LOCAL(t_scaleX,"scaleX")
	DBG_LOCAL(t_scaleY,"scaleY")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1456>");
	int t_srcX=m_tileMargin+(m_tileWidth+m_tileSpacing)*(t_tile % m_tileCountX);
	DBG_LOCAL(t_srcX,"srcX")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1457>");
	int t_srcY=m_tileMargin+(m_tileHeight+m_tileSpacing)*(t_tile/m_tileCountX);
	DBG_LOCAL(t_srcY,"srcY")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1458>");
	bb_graphics_DrawImageRect2(this->m_image,t_x,t_y,t_srcX,t_srcY,m_tileWidth,m_tileHeight,t_rotation,t_scaleX,t_scaleY,0);
}
void c_GameImage::p_LoadTileset(String t_file,int t_tileWidth,int t_tileHeight,int t_tileMargin,int t_tileSpacing,bool t_midhandle,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue){
	DBG_ENTER("GameImage.LoadTileset")
	c_GameImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_file,"file")
	DBG_LOCAL(t_tileWidth,"tileWidth")
	DBG_LOCAL(t_tileHeight,"tileHeight")
	DBG_LOCAL(t_tileMargin,"tileMargin")
	DBG_LOCAL(t_tileSpacing,"tileSpacing")
	DBG_LOCAL(t_midhandle,"midhandle")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1407>");
	p_Load(t_file,t_midhandle,false,0,0,0,false,String());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1408>");
	this->m_tileWidth=t_tileWidth;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1409>");
	this->m_tileHeight=t_tileHeight;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1410>");
	this->m_tileMargin=t_tileMargin;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1411>");
	this->m_tileSpacing=t_tileSpacing;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1412>");
	m_tileCountX=(m_w-t_tileMargin)/(t_tileWidth+t_tileSpacing);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1413>");
	m_tileCountY=(m_h-t_tileMargin)/(t_tileHeight+t_tileSpacing);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1414>");
	m_tileCount=m_tileCountX*m_tileCountY;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1415>");
	gc_assign(m_pixels,Array<int >(m_image->p_Width()*m_image->p_Height()));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1416>");
	this->m_readPixels=t_readPixels;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1417>");
	p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
}
void c_GameImage::mark(){
	Object::mark();
	gc_mark_q(m_image);
	gc_mark_q(m_pixels);
}
String c_GameImage::debug(){
	String t="(GameImage)\n";
	t+=dbg_decl("pixels",&m_pixels);
	t+=dbg_decl("maskRed",&m_maskRed);
	t+=dbg_decl("maskGreen",&m_maskGreen);
	t+=dbg_decl("maskBlue",&m_maskBlue);
	t+=dbg_decl("preLoad",&m_preLoad);
	t+=dbg_decl("path",&m_path);
	t+=dbg_decl("midhandle",&m_midhandle);
	t+=dbg_decl("screenName",&m_screenName);
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("image",&m_image);
	t+=dbg_decl("w",&m_w);
	t+=dbg_decl("h",&m_h);
	t+=dbg_decl("w2",&m_w2);
	t+=dbg_decl("h2",&m_h2);
	t+=dbg_decl("midhandled",&m_midhandled);
	t+=dbg_decl("frames",&m_frames);
	t+=dbg_decl("tileWidth",&m_tileWidth);
	t+=dbg_decl("tileHeight",&m_tileHeight);
	t+=dbg_decl("tileCountX",&m_tileCountX);
	t+=dbg_decl("tileCountY",&m_tileCountY);
	t+=dbg_decl("tileCount",&m_tileCount);
	t+=dbg_decl("tileSpacing",&m_tileSpacing);
	t+=dbg_decl("tileMargin",&m_tileMargin);
	t+=dbg_decl("subX",&m_subX);
	t+=dbg_decl("subY",&m_subY);
	t+=dbg_decl("atlasName",&m_atlasName);
	t+=dbg_decl("readPixels",&m_readPixels);
	return t;
}
c_Map3::c_Map3(){
	m_root=0;
}
c_Map3* c_Map3::m_new(){
	DBG_ENTER("Map.new")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>");
	return this;
}
c_MapKeys* c_Map3::p_Keys(){
	DBG_ENTER("Map.Keys")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>");
	c_MapKeys* t_=(new c_MapKeys)->m_new(this);
	return t_;
}
c_Node2* c_Map3::p_FirstNode(){
	DBG_ENTER("Map.FirstNode")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>");
	if(!((m_root)!=0)){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>");
	c_Node2* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>");
	while((t_node->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>");
		t_node=t_node->m_left;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>");
	return t_node;
}
c_Node2* c_Map3::p_FindNode(String t_key){
	DBG_ENTER("Map.FindNode")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>");
	c_Node2* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>");
		int t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_LOCAL(t_cmp,"cmp")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>");
				return t_node;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>");
	return t_node;
}
c_GameImage* c_Map3::p_Get(String t_key){
	DBG_ENTER("Map.Get")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>");
	c_Node2* t_node=p_FindNode(t_key);
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>");
	if((t_node)!=0){
		DBG_BLOCK();
		return t_node->m_value;
	}
	return 0;
}
int c_Map3::p_RotateLeft3(c_Node2* t_node){
	DBG_ENTER("Map.RotateLeft")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>");
	c_Node2* t_child=t_node->m_right;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>");
	gc_assign(t_node->m_right,t_child->m_left);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>");
	if((t_child->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>");
		gc_assign(t_child->m_left->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>");
		if(t_node==t_node->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>");
	gc_assign(t_child->m_left,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map3::p_RotateRight3(c_Node2* t_node){
	DBG_ENTER("Map.RotateRight")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>");
	c_Node2* t_child=t_node->m_left;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>");
	gc_assign(t_node->m_left,t_child->m_right);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>");
	if((t_child->m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>");
		gc_assign(t_child->m_right->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>");
		if(t_node==t_node->m_parent->m_right){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>");
	gc_assign(t_child->m_right,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map3::p_InsertFixup3(c_Node2* t_node){
	DBG_ENTER("Map.InsertFixup")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>");
	while(((t_node->m_parent)!=0) && t_node->m_parent->m_color==-1 && ((t_node->m_parent->m_parent)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>");
		if(t_node->m_parent==t_node->m_parent->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>");
			c_Node2* t_uncle=t_node->m_parent->m_parent->m_right;
			DBG_LOCAL(t_uncle,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>");
			if(((t_uncle)!=0) && t_uncle->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>");
				t_uncle->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>");
				t_uncle->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>");
				t_node=t_uncle->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>");
				if(t_node==t_node->m_parent->m_right){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>");
					p_RotateLeft3(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>");
				p_RotateRight3(t_node->m_parent->m_parent);
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>");
			c_Node2* t_uncle2=t_node->m_parent->m_parent->m_left;
			DBG_LOCAL(t_uncle2,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>");
			if(((t_uncle2)!=0) && t_uncle2->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>");
				t_uncle2->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>");
				t_uncle2->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>");
				t_node=t_uncle2->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>");
				if(t_node==t_node->m_parent->m_left){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>");
					p_RotateRight3(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>");
				p_RotateLeft3(t_node->m_parent->m_parent);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>");
	m_root->m_color=1;
	return 0;
}
bool c_Map3::p_Set3(String t_key,c_GameImage* t_value){
	DBG_ENTER("Map.Set")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>");
	c_Node2* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>");
	c_Node2* t_parent=0;
	int t_cmp=0;
	DBG_LOCAL(t_parent,"parent")
	DBG_LOCAL(t_cmp,"cmp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>");
		t_parent=t_node;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>");
		t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>");
				gc_assign(t_node->m_value,t_value);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>");
				return false;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>");
	t_node=(new c_Node2)->m_new(t_key,t_value,-1,t_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>");
	if((t_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>");
			gc_assign(t_parent->m_right,t_node);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>");
			gc_assign(t_parent->m_left,t_node);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>");
		p_InsertFixup3(t_node);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>");
		gc_assign(m_root,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>");
	return true;
}
bool c_Map3::p_Contains(String t_key){
	DBG_ENTER("Map.Contains")
	c_Map3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>");
	bool t_=p_FindNode(t_key)!=0;
	return t_;
}
void c_Map3::mark(){
	Object::mark();
	gc_mark_q(m_root);
}
String c_Map3::debug(){
	String t="(Map)\n";
	t+=dbg_decl("root",&m_root);
	return t;
}
c_StringMap3::c_StringMap3(){
}
c_StringMap3* c_StringMap3::m_new(){
	DBG_ENTER("StringMap.new")
	c_StringMap3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>");
	c_Map3::m_new();
	return this;
}
int c_StringMap3::p_Compare(String t_lhs,String t_rhs){
	DBG_ENTER("StringMap.Compare")
	c_StringMap3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>");
	int t_=t_lhs.Compare(t_rhs);
	return t_;
}
void c_StringMap3::mark(){
	c_Map3::mark();
}
String c_StringMap3::debug(){
	String t="(StringMap)\n";
	t=c_Map3::debug()+t;
	return t;
}
c_ImageBank::c_ImageBank(){
	m_path=String(L"graphics/",9);
}
c_ImageBank* c_ImageBank::m_new(){
	DBG_ENTER("ImageBank.new")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<993>");
	c_StringMap3::m_new();
	return this;
}
c_GameImage* c_ImageBank::p_Find(String t_name){
	DBG_ENTER("ImageBank.Find")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1256>");
	t_name=t_name.ToUpper();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1259>");
	if(bb_framework_diddyGame->m_debugOn){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1260>");
		c_KeyEnumerator* t_=this->p_Keys()->p_ObjectEnumerator();
		while(t_->p_HasNext()){
			DBG_BLOCK();
			String t_key=t_->p_NextObject();
			DBG_LOCAL(t_key,"key")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1261>");
			c_GameImage* t_i=this->p_Get(t_key);
			DBG_LOCAL(t_i,"i")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1262>");
			if(!t_i->m_preLoad){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1263>");
				bbPrint(t_key+String(L" is stored in the image map.",28));
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1267>");
	c_GameImage* t_i2=this->p_Get(t_name);
	DBG_LOCAL(t_i2,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1268>");
	bb_assert_AssertNotNull((t_i2),String(L"Image '",7)+t_name+String(L"' not found in the ImageBank",28));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1269>");
	if(t_i2->m_preLoad && t_i2->m_image==0){
		DBG_BLOCK();
		bb_assert_AssertError(String(L"Image '",7)+t_name+String(L"' not found in the ImageBank",28));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1270>");
	return t_i2;
}
String c_ImageBank::p_LoadAtlasString(String t_fileName){
	DBG_ENTER("ImageBank.LoadAtlasString")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fileName,"fileName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1014>");
	String t_str=bb_app_LoadString(m_path+t_fileName);
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1016>");
	bb_assert_AssertNotEqualInt(t_str.Length(),0,String(L"Error loading Atlas ",20)+m_path+t_fileName);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1017>");
	return t_str;
}
String c_ImageBank::p_SaveAtlasToBank(c_Image* t_pointer,String t_fileName){
	DBG_ENTER("ImageBank.SaveAtlasToBank")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_pointer,"pointer")
	DBG_LOCAL(t_fileName,"fileName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1022>");
	c_GameImage* t_atlasGameImage=(new c_GameImage)->m_new();
	DBG_LOCAL(t_atlasGameImage,"atlasGameImage")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1023>");
	t_atlasGameImage->m_name=String(L"_diddyAtlas_",12)+bb_functions_StripAll(t_fileName).ToUpper();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1024>");
	gc_assign(t_atlasGameImage->m_image,t_pointer);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1025>");
	t_atlasGameImage->p_CalcSize();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1026>");
	this->p_Set3(t_atlasGameImage->m_name,t_atlasGameImage);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1027>");
	return t_atlasGameImage->m_name;
}
void c_ImageBank::p_LoadSparrowAtlas(String t_fileName,bool t_midHandle,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue){
	DBG_ENTER("ImageBank.LoadSparrowAtlas")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fileName,"fileName")
	DBG_LOCAL(t_midHandle,"midHandle")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1173>");
	String t_str=p_LoadAtlasString(t_fileName);
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1175>");
	c_XMLParser* t_parser=(new c_XMLParser)->m_new();
	DBG_LOCAL(t_parser,"parser")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1176>");
	c_XMLDocument* t_doc=t_parser->p_ParseString(t_str);
	DBG_LOCAL(t_doc,"doc")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1177>");
	c_XMLElement* t_rootElement=t_doc->p_Root();
	DBG_LOCAL(t_rootElement,"rootElement")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1178>");
	String t_spriteFileName=t_rootElement->p_GetAttribute(String(L"imagePath",9),String());
	DBG_LOCAL(t_spriteFileName,"spriteFileName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1180>");
	c_Image* t_pointer=bb_graphics_LoadImage(m_path+t_spriteFileName,1,c_Image::m_DefaultFlags);
	DBG_LOCAL(t_pointer,"pointer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1181>");
	bb_assert_AssertNotNull((t_pointer),String(L"Error loading bitmap atlas ",27)+m_path+t_spriteFileName);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1183>");
	String t_atlasGameImageName=p_SaveAtlasToBank(t_pointer,t_fileName);
	DBG_LOCAL(t_atlasGameImageName,"atlasGameImageName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1185>");
	c_IEnumerator3* t_=t_rootElement->p_GetChildrenByName(String(L"SubTexture",10),String(),String(),String(),String(),String(),String(),String(),String(),String(),String())->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_XMLElement* t_node=t_->p_NextObject();
		DBG_LOCAL(t_node,"node")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1186>");
		int t_x=(t_node->p_GetAttribute(String(L"x",1),String()).Trim()).ToInt();
		DBG_LOCAL(t_x,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1187>");
		int t_y=(t_node->p_GetAttribute(String(L"y",1),String()).Trim()).ToInt();
		DBG_LOCAL(t_y,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1188>");
		int t_width=(t_node->p_GetAttribute(String(L"width",5),String()).Trim()).ToInt();
		DBG_LOCAL(t_width,"width")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1189>");
		int t_height=(t_node->p_GetAttribute(String(L"height",6),String()).Trim()).ToInt();
		DBG_LOCAL(t_height,"height")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1190>");
		String t_name=t_node->p_GetAttribute(String(L"name",4),String()).Trim();
		DBG_LOCAL(t_name,"name")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1192>");
		c_GameImage* t_gi=(new c_GameImage)->m_new();
		DBG_LOCAL(t_gi,"gi")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1193>");
		t_gi->m_name=t_name.ToUpper();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1194>");
		gc_assign(t_gi->m_image,t_pointer->p_GrabImage(t_x,t_y,t_width,t_height,1,c_Image::m_DefaultFlags));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1195>");
		t_gi->p_CalcSize();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1196>");
		t_gi->p_MidHandle(t_midHandle);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1198>");
		t_gi->m_atlasName=t_atlasGameImageName;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1199>");
		t_gi->m_subX=t_x;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1200>");
		t_gi->m_subY=t_y;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1201>");
		t_gi->m_readPixels=t_readPixels;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1202>");
		t_gi->p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1203>");
		this->p_Set3(t_gi->m_name,t_gi);
	}
}
void c_ImageBank::p_LoadLibGdxAtlas(String t_fileName,bool t_midHandle,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue){
	DBG_ENTER("ImageBank.LoadLibGdxAtlas")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fileName,"fileName")
	DBG_LOCAL(t_midHandle,"midHandle")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1031>");
	String t_str=p_LoadAtlasString(t_fileName);
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1032>");
	Array<String > t_all=t_str.Split(String(L"\n",1));
	DBG_LOCAL(t_all,"all")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1033>");
	String t_spriteFileName=t_all.At(0).Trim();
	DBG_LOCAL(t_spriteFileName,"spriteFileName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1034>");
	c_Image* t_pointer=bb_graphics_LoadImage(m_path+t_spriteFileName,1,c_Image::m_DefaultFlags);
	DBG_LOCAL(t_pointer,"pointer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1035>");
	bb_assert_AssertNotNull((t_pointer),String(L"Error loading bitmap atlas ",27)+m_path+t_spriteFileName);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1036>");
	String t_atlasGameImageName=p_SaveAtlasToBank(t_pointer,t_fileName);
	DBG_LOCAL(t_atlasGameImageName,"atlasGameImageName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1038>");
	String t_line=String();
	DBG_LOCAL(t_line,"line")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1039>");
	int t_i=4;
	DBG_LOCAL(t_i,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1040>");
	String t_[]={String(),String()};
	Array<String > t_xy=Array<String >(t_,2);
	DBG_LOCAL(t_xy,"xy")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1041>");
	bool t_debug=false;
	DBG_LOCAL(t_debug,"debug")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1042>");
	while(true){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1044>");
		t_line=t_all.At(t_i).Trim();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1045>");
		if(t_debug){
			DBG_BLOCK();
			bbPrint(String(L"name = ",7)+t_line);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1046>");
		if(t_line==String()){
			DBG_BLOCK();
			break;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1047>");
		String t_name=t_line;
		DBG_LOCAL(t_name,"name")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1049>");
		t_i+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1050>");
		t_line=t_all.At(t_i).Trim();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1051>");
		if(t_debug){
			DBG_BLOCK();
			bbPrint(String(L"rotate = ",9)+t_line);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1052>");
		String t_rotate=t_line;
		DBG_LOCAL(t_rotate,"rotate")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1054>");
		t_i+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1055>");
		t_line=t_all.At(t_i).Trim();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1056>");
		if(t_debug){
			DBG_BLOCK();
			bbPrint(String(L"x and y = ",10)+t_line);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1057>");
		t_xy=t_line.Slice(t_line.FindLast(String(L":",1))+1).Split(String(L",",1));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1058>");
		int t_x=(t_xy.At(0).Trim()).ToInt();
		DBG_LOCAL(t_x,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1059>");
		int t_y=(t_xy.At(1).Trim()).ToInt();
		DBG_LOCAL(t_y,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1061>");
		t_i+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1062>");
		t_line=t_all.At(t_i).Trim();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1063>");
		if(t_debug){
			DBG_BLOCK();
			bbPrint(String(L"width and height = ",19)+t_line);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1064>");
		t_xy=t_line.Slice(t_line.FindLast(String(L":",1))+1).Split(String(L",",1));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1065>");
		int t_width=(t_xy.At(0).Trim()).ToInt();
		DBG_LOCAL(t_width,"width")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1066>");
		int t_height=(t_xy.At(1).Trim()).ToInt();
		DBG_LOCAL(t_height,"height")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1068>");
		t_i+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1069>");
		t_line=t_all.At(t_i).Trim();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1070>");
		if(t_debug){
			DBG_BLOCK();
			bbPrint(String(L"origX and origY = ",18)+t_line);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1071>");
		t_xy=t_line.Slice(t_line.FindLast(String(L":",1))+1).Split(String(L",",1));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1072>");
		int t_origX=(t_xy.At(0).Trim()).ToInt();
		DBG_LOCAL(t_origX,"origX")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1073>");
		int t_origY=(t_xy.At(1).Trim()).ToInt();
		DBG_LOCAL(t_origY,"origY")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1075>");
		t_i+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1076>");
		t_line=t_all.At(t_i).Trim();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1077>");
		if(t_debug){
			DBG_BLOCK();
			bbPrint(String(L"offsets = ",10)+t_line);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1078>");
		t_xy=t_line.Slice(t_line.FindLast(String(L":",1))+1).Split(String(L",",1));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1079>");
		int t_offsetX=(t_xy.At(0).Trim()).ToInt();
		DBG_LOCAL(t_offsetX,"offsetX")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1080>");
		int t_offsetY=(t_xy.At(1).Trim()).ToInt();
		DBG_LOCAL(t_offsetY,"offsetY")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1082>");
		t_i+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1083>");
		t_line=t_all.At(t_i).Trim();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1084>");
		if(t_debug){
			DBG_BLOCK();
			bbPrint(String(L"index = ",8)+t_line);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1085>");
		int t_index=(t_line.Slice(t_line.FindLast(String(L":",1))+1).Trim()).ToInt();
		DBG_LOCAL(t_index,"index")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1086>");
		t_i+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1087>");
		c_GameImage* t_gi=(new c_GameImage)->m_new();
		DBG_LOCAL(t_gi,"gi")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1088>");
		if(t_index>-1){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1089>");
			t_name=t_name+String(t_index);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1091>");
		if(t_debug){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1092>");
			bbPrint(String(L"name    = ",10)+t_name);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1093>");
			bbPrint(String(L"x       = ",10)+String(t_x));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1094>");
			bbPrint(String(L"y       = ",10)+String(t_y));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1095>");
			bbPrint(String(L"width   = ",10)+String(t_width));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1096>");
			bbPrint(String(L"height  = ",10)+String(t_height));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1097>");
			bbPrint(String(L"origX   = ",10)+String(t_origX));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1098>");
			bbPrint(String(L"origY   = ",10)+String(t_origY));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1099>");
			bbPrint(String(L"offsetX = ",10)+String(t_offsetX));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1100>");
			bbPrint(String(L"offsetY = ",10)+String(t_offsetY));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1101>");
			bbPrint(String(L"index   = ",10)+String(t_index));
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1104>");
		t_gi->m_name=t_name.ToUpper();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1105>");
		gc_assign(t_gi->m_image,t_pointer->p_GrabImage(t_x,t_y,t_width,t_height,1,c_Image::m_DefaultFlags));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1106>");
		t_gi->p_CalcSize();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1107>");
		t_gi->p_MidHandle(t_midHandle);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1109>");
		t_gi->m_atlasName=t_atlasGameImageName;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1110>");
		t_gi->m_subX=t_x;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1111>");
		t_gi->m_subY=t_y;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1112>");
		t_gi->m_readPixels=t_readPixels;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1113>");
		t_gi->p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1115>");
		this->p_Set3(t_gi->m_name,t_gi);
	}
}
void c_ImageBank::p_LoadJsonAtlas(String t_fileName,bool t_midHandle,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue){
	DBG_ENTER("ImageBank.LoadJsonAtlas")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fileName,"fileName")
	DBG_LOCAL(t_midHandle,"midHandle")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1121>");
	String t_str=p_LoadAtlasString(t_fileName);
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1123>");
	c_JsonObject* t_jso=(new c_JsonObject)->m_new3(t_str);
	DBG_LOCAL(t_jso,"jso")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1125>");
	c_JsonObject* t_meta=dynamic_cast<c_JsonObject*>(t_jso->p_Get3(String(L"meta",4),0));
	DBG_LOCAL(t_meta,"meta")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1126>");
	c_JsonValue* t_image=t_meta->p_Get3(String(L"image",5),0);
	DBG_LOCAL(t_image,"image")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1127>");
	String t_spriteFileName=t_image->p_StringValue();
	DBG_LOCAL(t_spriteFileName,"spriteFileName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1129>");
	c_Image* t_pointer=bb_graphics_LoadImage(m_path+t_spriteFileName,1,c_Image::m_DefaultFlags);
	DBG_LOCAL(t_pointer,"pointer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1130>");
	bb_assert_AssertNotNull((t_pointer),String(L"Error loading bitmap atlas ",27)+m_path+t_spriteFileName);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1132>");
	String t_atlasGameImageName=p_SaveAtlasToBank(t_pointer,t_fileName);
	DBG_LOCAL(t_atlasGameImageName,"atlasGameImageName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1134>");
	c_JsonObject* t_sprs=dynamic_cast<c_JsonObject*>(t_jso->p_Get3(String(L"frames",6),0));
	DBG_LOCAL(t_sprs,"sprs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1135>");
	c_NodeEnumerator* t_=t_sprs->p_GetData()->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_Node5* t_it=t_->p_NextObject();
		DBG_LOCAL(t_it,"it")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1136>");
		String t_name=t_it->p_Key();
		DBG_LOCAL(t_name,"name")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1138>");
		c_JsonObject* t_spr=dynamic_cast<c_JsonObject*>(t_it->p_Value());
		DBG_LOCAL(t_spr,"spr")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1139>");
		c_JsonObject* t_frame=dynamic_cast<c_JsonObject*>(t_spr->p_Get3(String(L"frame",5),0));
		DBG_LOCAL(t_frame,"frame")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1140>");
		int t_x=t_frame->p_GetInt(String(L"x",1),0);
		DBG_LOCAL(t_x,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1141>");
		int t_y=t_frame->p_GetInt(String(L"y",1),0);
		DBG_LOCAL(t_y,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1142>");
		int t_w=t_frame->p_GetInt(String(L"w",1),0);
		DBG_LOCAL(t_w,"w")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1143>");
		int t_h=t_frame->p_GetInt(String(L"h",1),0);
		DBG_LOCAL(t_h,"h")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1145>");
		c_JsonValue* t_rotated=t_spr->p_Get3(String(L"rotated",7),0);
		DBG_LOCAL(t_rotated,"rotated")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1148>");
		c_JsonValue* t_trimmed=t_spr->p_Get3(String(L"trimmed",7),0);
		DBG_LOCAL(t_trimmed,"trimmed")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1151>");
		c_JsonObject* t_spriteSourceSize=dynamic_cast<c_JsonObject*>(t_spr->p_Get3(String(L"spriteSourceSize",16),0));
		DBG_LOCAL(t_spriteSourceSize,"spriteSourceSize")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1154>");
		c_JsonObject* t_sourceSize=dynamic_cast<c_JsonObject*>(t_spr->p_Get3(String(L"sourceSize",10),0));
		DBG_LOCAL(t_sourceSize,"sourceSize")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1157>");
		c_GameImage* t_gi=(new c_GameImage)->m_new();
		DBG_LOCAL(t_gi,"gi")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1158>");
		t_gi->m_name=t_name.ToUpper();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1159>");
		gc_assign(t_gi->m_image,t_pointer->p_GrabImage(t_x,t_y,t_w,t_h,1,c_Image::m_DefaultFlags));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1160>");
		t_gi->p_CalcSize();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1161>");
		t_gi->p_MidHandle(t_midHandle);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1163>");
		t_gi->m_atlasName=t_atlasGameImageName;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1164>");
		t_gi->m_subX=t_x;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1165>");
		t_gi->m_subY=t_y;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1166>");
		t_gi->m_readPixels=t_readPixels;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1167>");
		t_gi->p_SetMaskColor(t_maskRed,t_maskGreen,t_maskBlue);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1168>");
		this->p_Set3(t_gi->m_name,t_gi);
	}
}
void c_ImageBank::p_LoadAtlas(String t_fileName,int t_format,bool t_midHandle,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue){
	DBG_ENTER("ImageBank.LoadAtlas")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fileName,"fileName")
	DBG_LOCAL(t_format,"format")
	DBG_LOCAL(t_midHandle,"midHandle")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1002>");
	if(t_format==0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1003>");
		p_LoadSparrowAtlas(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1004>");
		if(t_format==1){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1005>");
			p_LoadLibGdxAtlas(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1006>");
			if(t_format==2){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1007>");
				p_LoadJsonAtlas(t_fileName,t_midHandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1009>");
				bbError(String(L"Invalid atlas format",20));
			}
		}
	}
}
c_GameImage* c_ImageBank::p_FindSet(String t_name,int t_w,int t_h,int t_frames,bool t_midhandle,String t_nameoverride){
	DBG_ENTER("ImageBank.FindSet")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_w,"w")
	DBG_LOCAL(t_h,"h")
	DBG_LOCAL(t_frames,"frames")
	DBG_LOCAL(t_midhandle,"midhandle")
	DBG_LOCAL(t_nameoverride,"nameoverride")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1281>");
	t_name=t_name.ToUpper();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1282>");
	c_GameImage* t_subImage=this->p_Get(t_name);
	DBG_LOCAL(t_subImage,"subImage")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1283>");
	bb_assert_AssertNotNull((t_subImage),String(L"Image '",7)+t_name+String(L"' not found in the ImageBank",28));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1284>");
	c_GameImage* t_atlasGameImage=this->p_Get(t_subImage->m_atlasName);
	DBG_LOCAL(t_atlasGameImage,"atlasGameImage")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1285>");
	bb_assert_AssertNotNull((t_atlasGameImage),String(L"Atlas Image '",13)+t_name+String(L"' not found in the ImageBank",28));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1286>");
	c_Image* t_image=t_atlasGameImage->m_image->p_GrabImage(t_subImage->m_subX,t_subImage->m_subY,t_w,t_h,t_frames,c_Image::m_DefaultFlags);
	DBG_LOCAL(t_image,"image")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1288>");
	c_GameImage* t_gi=(new c_GameImage)->m_new();
	DBG_LOCAL(t_gi,"gi")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1289>");
	String t_storeKey=t_nameoverride.ToUpper();
	DBG_LOCAL(t_storeKey,"storeKey")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1290>");
	if(t_storeKey==String()){
		DBG_BLOCK();
		t_storeKey=t_name.ToUpper();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1291>");
	t_gi->m_name=t_storeKey;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1292>");
	gc_assign(t_gi->m_image,t_image);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1293>");
	t_gi->p_CalcSize();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1294>");
	t_gi->p_MidHandle(t_midhandle);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1295>");
	return t_gi;
}
c_GameImage* c_ImageBank::p_LoadTileset2(String t_name,int t_tileWidth,int t_tileHeight,int t_tileMargin,int t_tileSpacing,String t_nameoverride,bool t_midhandle,bool t_ignoreCache,bool t_readPixels,int t_maskRed,int t_maskGreen,int t_maskBlue){
	DBG_ENTER("ImageBank.LoadTileset")
	c_ImageBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_tileWidth,"tileWidth")
	DBG_LOCAL(t_tileHeight,"tileHeight")
	DBG_LOCAL(t_tileMargin,"tileMargin")
	DBG_LOCAL(t_tileSpacing,"tileSpacing")
	DBG_LOCAL(t_nameoverride,"nameoverride")
	DBG_LOCAL(t_midhandle,"midhandle")
	DBG_LOCAL(t_ignoreCache,"ignoreCache")
	DBG_LOCAL(t_readPixels,"readPixels")
	DBG_LOCAL(t_maskRed,"maskRed")
	DBG_LOCAL(t_maskGreen,"maskGreen")
	DBG_LOCAL(t_maskBlue,"maskBlue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1240>");
	String t_storeKey=t_nameoverride.ToUpper();
	DBG_LOCAL(t_storeKey,"storeKey")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1241>");
	if(t_storeKey==String()){
		DBG_BLOCK();
		t_storeKey=bb_functions_StripAll(t_name.ToUpper());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1242>");
	if(!t_ignoreCache && this->p_Contains(t_storeKey)){
		DBG_BLOCK();
		c_GameImage* t_=this->p_Get(t_storeKey);
		return t_;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1245>");
	if(this->p_Contains(t_storeKey)){
		DBG_BLOCK();
		this->p_Get(t_storeKey)->m_image->p_Discard();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1248>");
	c_GameImage* t_i=(new c_GameImage)->m_new();
	DBG_LOCAL(t_i,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1249>");
	t_i->p_LoadTileset(m_path+t_name,t_tileWidth,t_tileHeight,t_tileMargin,t_tileSpacing,t_midhandle,t_readPixels,t_maskRed,t_maskGreen,t_maskBlue);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1250>");
	t_i->m_name=t_storeKey;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1251>");
	this->p_Set3(t_i->m_name,t_i);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1252>");
	return t_i;
}
void c_ImageBank::mark(){
	c_StringMap3::mark();
}
String c_ImageBank::debug(){
	String t="(ImageBank)\n";
	t=c_StringMap3::debug()+t;
	t+=dbg_decl("path",&m_path);
	return t;
}
c_GameSound::c_GameSound(){
	m_preLoad=false;
	m_screenName=String();
	m_path=String();
	m_sound=0;
	m_name=String();
}
void c_GameSound::p_Load2(String t_file,bool t_preLoad,String t_screenName){
	DBG_ENTER("GameSound.Load")
	c_GameSound *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_file,"file")
	DBG_LOCAL(t_preLoad,"preLoad")
	DBG_LOCAL(t_screenName,"screenName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1652>");
	this->m_path=t_file;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1653>");
	this->m_preLoad=t_preLoad;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1654>");
	this->m_screenName=t_screenName;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1655>");
	if(!t_preLoad){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1656>");
		if(t_file.Contains(String(L".wav",4)) || t_file.Contains(String(L".ogg",4)) || t_file.Contains(String(L".mp3",4)) || t_file.Contains(String(L".m4a",4)) || t_file.Contains(String(L".wma",4))){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1657>");
			gc_assign(m_sound,bb_functions_LoadSoundSample(c_SoundBank::m_path+t_file));
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1664>");
			gc_assign(m_sound,bb_functions_LoadSoundSample(c_SoundBank::m_path+t_file+String(L".wav",4)));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1668>");
	m_name=bb_functions_StripAll(t_file.ToUpper());
}
void c_GameSound::mark(){
	Object::mark();
	gc_mark_q(m_sound);
}
String c_GameSound::debug(){
	String t="(GameSound)\n";
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("sound",&m_sound);
	t+=dbg_decl("screenName",&m_screenName);
	t+=dbg_decl("preLoad",&m_preLoad);
	t+=dbg_decl("path",&m_path);
	return t;
}
c_Map4::c_Map4(){
	m_root=0;
}
c_Map4* c_Map4::m_new(){
	DBG_ENTER("Map.new")
	c_Map4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>");
	return this;
}
c_MapKeys2* c_Map4::p_Keys(){
	DBG_ENTER("Map.Keys")
	c_Map4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<113>");
	c_MapKeys2* t_=(new c_MapKeys2)->m_new(this);
	return t_;
}
c_Node4* c_Map4::p_FirstNode(){
	DBG_ENTER("Map.FirstNode")
	c_Map4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>");
	if(!((m_root)!=0)){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>");
	c_Node4* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>");
	while((t_node->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>");
		t_node=t_node->m_left;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>");
	return t_node;
}
c_Node4* c_Map4::p_FindNode(String t_key){
	DBG_ENTER("Map.FindNode")
	c_Map4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>");
	c_Node4* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>");
		int t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_LOCAL(t_cmp,"cmp")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>");
				return t_node;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>");
	return t_node;
}
c_GameSound* c_Map4::p_Get(String t_key){
	DBG_ENTER("Map.Get")
	c_Map4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>");
	c_Node4* t_node=p_FindNode(t_key);
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>");
	if((t_node)!=0){
		DBG_BLOCK();
		return t_node->m_value;
	}
	return 0;
}
void c_Map4::mark(){
	Object::mark();
	gc_mark_q(m_root);
}
String c_Map4::debug(){
	String t="(Map)\n";
	t+=dbg_decl("root",&m_root);
	return t;
}
c_StringMap4::c_StringMap4(){
}
c_StringMap4* c_StringMap4::m_new(){
	DBG_ENTER("StringMap.new")
	c_StringMap4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>");
	c_Map4::m_new();
	return this;
}
int c_StringMap4::p_Compare(String t_lhs,String t_rhs){
	DBG_ENTER("StringMap.Compare")
	c_StringMap4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>");
	int t_=t_lhs.Compare(t_rhs);
	return t_;
}
void c_StringMap4::mark(){
	c_Map4::mark();
}
String c_StringMap4::debug(){
	String t="(StringMap)\n";
	t=c_Map4::debug()+t;
	return t;
}
c_SoundBank::c_SoundBank(){
}
c_SoundBank* c_SoundBank::m_new(){
	DBG_ENTER("SoundBank.new")
	c_SoundBank *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1594>");
	c_StringMap4::m_new();
	return this;
}
String c_SoundBank::m_path;
void c_SoundBank::mark(){
	c_StringMap4::mark();
}
String c_SoundBank::debug(){
	String t="(SoundBank)\n";
	t=c_StringMap4::debug()+t;
	t+=dbg_decl("path",&c_SoundBank::m_path);
	return t;
}
c_InputCache::c_InputCache(){
	m_keyHitEnumerator=0;
	m_keyDownEnumerator=0;
	m_keyReleasedEnumerator=0;
	m_keyHitWrapper=0;
	m_keyDownWrapper=0;
	m_keyReleasedWrapper=0;
	m_touchData=Array<c_TouchData* >(32);
	m_monitorTouch=false;
	m_monitorMouse=false;
	m_touchDownCount=0;
	m_touchHitCount=0;
	m_touchReleasedCount=0;
	m_maxTouchDown=-1;
	m_maxTouchHit=-1;
	m_maxTouchReleased=-1;
	m_minTouchDown=-1;
	m_minTouchHit=-1;
	m_minTouchReleased=-1;
	m_touchHit=Array<int >(32);
	m_touchHitTime=Array<int >(32);
	m_touchDown=Array<int >(32);
	m_touchDownTime=Array<int >(32);
	m_touchReleasedTime=Array<int >(32);
	m_touchReleased=Array<int >(32);
	m_touchX=Array<Float >(32);
	m_touchY=Array<Float >(32);
	m_currentTouchDown=Array<int >(32);
	m_currentTouchHit=Array<int >(32);
	m_currentTouchReleased=Array<int >(32);
	m_mouseDownCount=0;
	m_mouseHitCount=0;
	m_mouseReleasedCount=0;
	m_mouseX=0;
	m_mouseY=0;
	m_mouseHit=Array<int >(3);
	m_mouseHitTime=Array<int >(3);
	m_mouseDown=Array<int >(3);
	m_mouseDownTime=Array<int >(3);
	m_mouseReleasedTime=Array<int >(3);
	m_mouseReleased=Array<int >(3);
	m_currentMouseDown=Array<int >(3);
	m_currentMouseHit=Array<int >(3);
	m_currentMouseReleased=Array<int >(3);
	m_keyDownCount=0;
	m_keyHitCount=0;
	m_keyReleasedCount=0;
	m_monitorKeyCount=0;
	m_monitorKey=Array<bool >(512);
	m_keyHit=Array<int >(512);
	m_keyHitTime=Array<int >(512);
	m_keyDown=Array<int >(512);
	m_keyDownTime=Array<int >(512);
	m_keyReleasedTime=Array<int >(512);
	m_keyReleased=Array<int >(512);
	m_currentKeysDown=Array<int >(512);
	m_currentKeysHit=Array<int >(512);
	m_currentKeysReleased=Array<int >(512);
	m_flingThreshold=FLOAT(250.0);
	m_longPressTime=1000;
}
c_InputCache* c_InputCache::m_new(){
	DBG_ENTER("InputCache.new")
	c_InputCache *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<183>");
	gc_assign(m_keyHitEnumerator,(new c_KeyEventEnumerator)->m_new(this,3));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<184>");
	gc_assign(m_keyDownEnumerator,(new c_KeyEventEnumerator)->m_new(this,1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<185>");
	gc_assign(m_keyReleasedEnumerator,(new c_KeyEventEnumerator)->m_new(this,2));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<186>");
	gc_assign(m_keyHitWrapper,(new c_EnumWrapper)->m_new(m_keyHitEnumerator));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<187>");
	gc_assign(m_keyDownWrapper,(new c_EnumWrapper)->m_new(m_keyDownEnumerator));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<188>");
	gc_assign(m_keyReleasedWrapper,(new c_EnumWrapper)->m_new(m_keyReleasedEnumerator));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<189>");
	for(int t_i=0;t_i<m_touchData.Length();t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<190>");
		gc_assign(m_touchData.At(t_i),(new c_TouchData)->m_new());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<196>");
	m_monitorTouch=false;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<197>");
	m_monitorMouse=true;
	return this;
}
void c_InputCache::p_ReadInput(){
	DBG_ENTER("InputCache.ReadInput")
	c_InputCache *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<290>");
	int t_newval=0;
	DBG_LOCAL(t_newval,"newval")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<291>");
	int t_now=bb_app_Millisecs();
	DBG_LOCAL(t_now,"now")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<294>");
	if(m_monitorTouch){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<295>");
		m_touchDownCount=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<296>");
		m_touchHitCount=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<297>");
		m_touchReleasedCount=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<298>");
		m_maxTouchDown=-1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<299>");
		m_maxTouchHit=-1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<300>");
		m_maxTouchReleased=-1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<301>");
		m_minTouchDown=-1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<302>");
		m_minTouchHit=-1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<303>");
		m_minTouchReleased=-1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<304>");
		for(int t_i=0;t_i<32;t_i=t_i+1){
			DBG_BLOCK();
			DBG_LOCAL(t_i,"i")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<306>");
			t_newval=bb_input_TouchHit(t_i);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<307>");
			if(!((m_touchHit.At(t_i))!=0) && ((t_newval)!=0)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<308>");
				m_touchHitTime.At(t_i)=t_now;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<310>");
			m_touchHit.At(t_i)=t_newval;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<312>");
			t_newval=bb_input_TouchDown(t_i);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<313>");
			if(((t_newval)!=0) && !((m_touchDown.At(t_i))!=0)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<314>");
				m_touchDownTime.At(t_i)=t_now;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<317>");
			if(((m_touchDown.At(t_i))!=0) && !((t_newval)!=0)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<318>");
				m_touchReleasedTime.At(t_i)=t_now;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<319>");
				m_touchReleased.At(t_i)=1;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<321>");
				m_touchReleased.At(t_i)=0;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<323>");
			m_touchDown.At(t_i)=t_newval;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<325>");
			m_touchX.At(t_i)=bb_input_TouchX(t_i);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<326>");
			m_touchY.At(t_i)=bb_input_TouchY(t_i);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<328>");
			if((m_touchDown.At(t_i))!=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<329>");
				m_currentTouchDown.At(m_touchDownCount)=t_i;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<330>");
				m_touchDownCount+=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<331>");
				if(m_minTouchDown<0){
					DBG_BLOCK();
					m_minTouchDown=t_i;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<332>");
				m_maxTouchDown=t_i;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<334>");
			if((m_touchHit.At(t_i))!=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<335>");
				m_currentTouchHit.At(m_touchHitCount)=t_i;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<336>");
				m_touchHitCount+=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<337>");
				if(m_minTouchHit<0){
					DBG_BLOCK();
					m_minTouchHit=t_i;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<338>");
				m_maxTouchHit=t_i;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<340>");
			if((m_touchReleased.At(t_i))!=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<341>");
				m_currentTouchReleased.At(m_touchReleasedCount)=t_i;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<342>");
				m_touchReleasedCount+=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<343>");
				if(m_minTouchReleased<0){
					DBG_BLOCK();
					m_minTouchReleased=t_i;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<344>");
				m_maxTouchReleased=t_i;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<350>");
	if(m_monitorMouse){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<351>");
		m_mouseDownCount=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<352>");
		m_mouseHitCount=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<353>");
		m_mouseReleasedCount=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<354>");
		m_mouseX=bb_framework_diddyGame->m_mouseX;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<355>");
		m_mouseY=bb_framework_diddyGame->m_mouseY;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<356>");
		for(int t_i2=0;t_i2<3;t_i2=t_i2+1){
			DBG_BLOCK();
			DBG_LOCAL(t_i2,"i")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<358>");
			t_newval=bb_input_MouseHit(t_i2);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<359>");
			if(!((m_mouseHit.At(t_i2))!=0) && ((t_newval)!=0)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<360>");
				m_mouseHitTime.At(t_i2)=t_now;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<362>");
			m_mouseHit.At(t_i2)=t_newval;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<364>");
			t_newval=bb_input_MouseDown(t_i2);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<365>");
			if(((t_newval)!=0) && !((m_mouseDown.At(t_i2))!=0)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<366>");
				m_mouseDownTime.At(t_i2)=t_now;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<369>");
			if(((m_mouseDown.At(t_i2))!=0) && !((t_newval)!=0)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<370>");
				m_mouseReleasedTime.At(t_i2)=t_now;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<371>");
				m_mouseReleased.At(t_i2)=1;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<373>");
				m_mouseReleased.At(t_i2)=0;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<375>");
			m_mouseDown.At(t_i2)=t_newval;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<377>");
			if((m_mouseDown.At(t_i2))!=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<378>");
				m_currentMouseDown.At(m_mouseDownCount)=t_i2;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<379>");
				m_mouseDownCount+=1;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<381>");
			if((m_mouseHit.At(t_i2))!=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<382>");
				m_currentMouseHit.At(m_mouseHitCount)=t_i2;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<383>");
				m_mouseHitCount+=1;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<385>");
			if((m_mouseReleased.At(t_i2))!=0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<386>");
				m_currentMouseReleased.At(m_mouseReleasedCount)=t_i2;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<387>");
				m_mouseReleasedCount+=1;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<393>");
	m_keyDownCount=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<394>");
	m_keyHitCount=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<395>");
	m_keyReleasedCount=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<396>");
	if(m_monitorKeyCount>0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<397>");
		for(int t_i3=8;t_i3<=222;t_i3=t_i3+1){
			DBG_BLOCK();
			DBG_LOCAL(t_i3,"i")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<398>");
			if(m_monitorKey.At(t_i3)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<400>");
				t_newval=bb_input_KeyHit(t_i3);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<401>");
				if(!((m_keyHit.At(t_i3))!=0) && ((t_newval)!=0)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<402>");
					m_keyHitTime.At(t_i3)=t_now;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<404>");
				m_keyHit.At(t_i3)=t_newval;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<406>");
				t_newval=bb_input_KeyDown(t_i3);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<407>");
				if(((t_newval)!=0) && !((m_keyDown.At(t_i3))!=0)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<408>");
					m_keyDownTime.At(t_i3)=t_now;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<411>");
				if(((m_keyDown.At(t_i3))!=0) && !((t_newval)!=0)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<412>");
					m_keyReleasedTime.At(t_i3)=t_now;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<413>");
					m_keyReleased.At(t_i3)=1;
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<415>");
					m_keyReleased.At(t_i3)=0;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<417>");
				m_keyDown.At(t_i3)=t_newval;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<419>");
				if((m_keyDown.At(t_i3))!=0){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<420>");
					m_currentKeysDown.At(m_keyDownCount)=t_i3;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<421>");
					m_keyDownCount+=1;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<423>");
				if((m_keyHit.At(t_i3))!=0){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<424>");
					m_currentKeysHit.At(m_keyHitCount)=t_i3;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<425>");
					m_keyHitCount+=1;
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<427>");
				if((m_keyReleased.At(t_i3))!=0){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<428>");
					m_currentKeysReleased.At(m_keyReleasedCount)=t_i3;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<429>");
					m_keyReleasedCount+=1;
				}
			}
		}
	}
}
void c_InputCache::p_HandleEvents(c_Screen* t_screen){
	DBG_ENTER("InputCache.HandleEvents")
	c_InputCache *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_screen,"screen")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<438>");
	for(int t_i=0;t_i<m_touchHitCount;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<439>");
		int t_pointer=m_currentTouchHit.At(t_i);
		DBG_LOCAL(t_pointer,"pointer")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<440>");
		int t_x=int(m_touchX.At(t_pointer));
		DBG_LOCAL(t_x,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<441>");
		int t_y=int(m_touchY.At(t_pointer));
		DBG_LOCAL(t_y,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<442>");
		m_touchData.At(t_pointer)->p_Reset(t_x,t_y);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<443>");
		t_screen->p_OnTouchHit(t_x,t_y,t_pointer);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<447>");
	for(int t_i2=0;t_i2<m_touchReleasedCount;t_i2=t_i2+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i2,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<448>");
		int t_pointer2=m_currentTouchReleased.At(t_i2);
		DBG_LOCAL(t_pointer2,"pointer")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<449>");
		int t_x2=int(m_touchX.At(t_pointer2));
		DBG_LOCAL(t_x2,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<450>");
		int t_y2=int(m_touchY.At(t_pointer2));
		DBG_LOCAL(t_y2,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<451>");
		m_touchData.At(t_pointer2)->p_Update3(t_x2,t_y2);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<452>");
		if(!m_touchData.At(t_pointer2)->m_movedTooFar && !m_touchData.At(t_pointer2)->m_firedLongPress){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<453>");
			t_screen->p_OnTouchClick(t_x2,t_y2,t_pointer2);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<458>");
			if(m_touchData.At(t_pointer2)->m_touchVelocityX*m_touchData.At(t_pointer2)->m_touchVelocityX+m_touchData.At(t_pointer2)->m_touchVelocityY*m_touchData.At(t_pointer2)->m_touchVelocityY>=m_flingThreshold*m_flingThreshold){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<460>");
				t_screen->p_OnTouchFling(t_x2,t_y2,m_touchData.At(t_pointer2)->m_touchVelocityX,m_touchData.At(t_pointer2)->m_touchVelocityY,m_touchData.At(t_pointer2)->m_touchVelocitySpeed,t_pointer2);
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<463>");
		t_screen->p_OnTouchReleased(t_x2,t_y2,t_pointer2);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<466>");
	for(int t_i3=0;t_i3<m_touchDownCount;t_i3=t_i3+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i3,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<467>");
		int t_pointer3=m_currentTouchDown.At(t_i3);
		DBG_LOCAL(t_pointer3,"pointer")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<468>");
		int t_x3=int(m_touchX.At(t_pointer3));
		DBG_LOCAL(t_x3,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<469>");
		int t_y3=int(m_touchY.At(t_pointer3));
		DBG_LOCAL(t_y3,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<470>");
		m_touchData.At(t_pointer3)->p_Update3(t_x3,t_y3);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<471>");
		t_screen->p_OnTouchDragged(t_x3,t_y3,m_touchData.At(t_pointer3)->m_distanceMovedX,m_touchData.At(t_pointer3)->m_distanceMovedY,t_pointer3);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<473>");
		if(!m_touchData.At(t_pointer3)->m_testedLongPress && bb_framework_dt->m_currentticks-Float(m_touchData.At(t_pointer3)->m_firstTouchTime)>=Float(m_longPressTime)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<474>");
			m_touchData.At(t_pointer3)->m_testedLongPress=true;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<475>");
			if(!m_touchData.At(t_pointer3)->m_movedTooFar){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<477>");
				t_screen->p_OnTouchLongPress(t_x3,t_y3,t_pointer3);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<478>");
				m_touchData.At(t_pointer3)->m_firedLongPress=true;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<484>");
	if(m_keyHitCount>0){
		DBG_BLOCK();
		t_screen->p_OnAnyKeyHit();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<485>");
	for(int t_i4=0;t_i4<m_keyHitCount;t_i4=t_i4+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i4,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<486>");
		int t_key=m_currentKeysHit.At(t_i4);
		DBG_LOCAL(t_key,"key")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<487>");
		t_screen->p_OnKeyHit(t_key);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<491>");
	if(m_keyDownCount>0){
		DBG_BLOCK();
		t_screen->p_OnAnyKeyDown();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<492>");
	for(int t_i5=0;t_i5<m_keyDownCount;t_i5=t_i5+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i5,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<493>");
		int t_key2=m_currentKeysDown.At(t_i5);
		DBG_LOCAL(t_key2,"key")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<494>");
		t_screen->p_OnKeyDown(t_key2);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<498>");
	if(m_keyReleasedCount>0){
		DBG_BLOCK();
		t_screen->p_OnAnyKeyReleased();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<499>");
	for(int t_i6=0;t_i6<m_keyReleasedCount;t_i6=t_i6+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i6,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<500>");
		int t_key3=m_currentKeysReleased.At(t_i6);
		DBG_LOCAL(t_key3,"key")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<501>");
		t_screen->p_OnKeyReleased(t_key3);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<504>");
	for(int t_i7=0;t_i7<m_mouseHitCount;t_i7=t_i7+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i7,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<505>");
		int t_button=m_currentMouseHit.At(t_i7);
		DBG_LOCAL(t_button,"button")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<506>");
		int t_x4=m_mouseX;
		DBG_LOCAL(t_x4,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<507>");
		int t_y4=m_mouseY;
		DBG_LOCAL(t_y4,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<508>");
		t_screen->p_OnMouseHit(t_x4,t_y4,t_button);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<511>");
	for(int t_i8=0;t_i8<m_mouseDownCount;t_i8=t_i8+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i8,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<512>");
		int t_button2=m_currentMouseDown.At(t_i8);
		DBG_LOCAL(t_button2,"button")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<513>");
		int t_x5=m_mouseX;
		DBG_LOCAL(t_x5,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<514>");
		int t_y5=m_mouseY;
		DBG_LOCAL(t_y5,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<515>");
		t_screen->p_OnMouseDown(t_x5,t_y5,t_button2);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<518>");
	for(int t_i9=0;t_i9<m_mouseReleasedCount;t_i9=t_i9+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i9,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<519>");
		int t_button3=m_currentMouseReleased.At(t_i9);
		DBG_LOCAL(t_button3,"button")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<520>");
		int t_x6=m_mouseX;
		DBG_LOCAL(t_x6,"x")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<521>");
		int t_y6=m_mouseY;
		DBG_LOCAL(t_y6,"y")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<522>");
		t_screen->p_OnMouseReleased(t_x6,t_y6,t_button3);
	}
}
void c_InputCache::mark(){
	Object::mark();
	gc_mark_q(m_keyHitEnumerator);
	gc_mark_q(m_keyDownEnumerator);
	gc_mark_q(m_keyReleasedEnumerator);
	gc_mark_q(m_keyHitWrapper);
	gc_mark_q(m_keyDownWrapper);
	gc_mark_q(m_keyReleasedWrapper);
	gc_mark_q(m_touchData);
	gc_mark_q(m_touchHit);
	gc_mark_q(m_touchHitTime);
	gc_mark_q(m_touchDown);
	gc_mark_q(m_touchDownTime);
	gc_mark_q(m_touchReleasedTime);
	gc_mark_q(m_touchReleased);
	gc_mark_q(m_touchX);
	gc_mark_q(m_touchY);
	gc_mark_q(m_currentTouchDown);
	gc_mark_q(m_currentTouchHit);
	gc_mark_q(m_currentTouchReleased);
	gc_mark_q(m_mouseHit);
	gc_mark_q(m_mouseHitTime);
	gc_mark_q(m_mouseDown);
	gc_mark_q(m_mouseDownTime);
	gc_mark_q(m_mouseReleasedTime);
	gc_mark_q(m_mouseReleased);
	gc_mark_q(m_currentMouseDown);
	gc_mark_q(m_currentMouseHit);
	gc_mark_q(m_currentMouseReleased);
	gc_mark_q(m_monitorKey);
	gc_mark_q(m_keyHit);
	gc_mark_q(m_keyHitTime);
	gc_mark_q(m_keyDown);
	gc_mark_q(m_keyDownTime);
	gc_mark_q(m_keyReleasedTime);
	gc_mark_q(m_keyReleased);
	gc_mark_q(m_currentKeysDown);
	gc_mark_q(m_currentKeysHit);
	gc_mark_q(m_currentKeysReleased);
}
String c_InputCache::debug(){
	String t="(InputCache)\n";
	t+=dbg_decl("keyHitEnumerator",&m_keyHitEnumerator);
	t+=dbg_decl("keyDownEnumerator",&m_keyDownEnumerator);
	t+=dbg_decl("keyReleasedEnumerator",&m_keyReleasedEnumerator);
	t+=dbg_decl("keyHitWrapper",&m_keyHitWrapper);
	t+=dbg_decl("keyDownWrapper",&m_keyDownWrapper);
	t+=dbg_decl("keyReleasedWrapper",&m_keyReleasedWrapper);
	t+=dbg_decl("touchHit",&m_touchHit);
	t+=dbg_decl("touchHitTime",&m_touchHitTime);
	t+=dbg_decl("touchDown",&m_touchDown);
	t+=dbg_decl("touchDownTime",&m_touchDownTime);
	t+=dbg_decl("touchReleased",&m_touchReleased);
	t+=dbg_decl("touchReleasedTime",&m_touchReleasedTime);
	t+=dbg_decl("touchDownCount",&m_touchDownCount);
	t+=dbg_decl("touchHitCount",&m_touchHitCount);
	t+=dbg_decl("touchReleasedCount",&m_touchReleasedCount);
	t+=dbg_decl("maxTouchDown",&m_maxTouchDown);
	t+=dbg_decl("maxTouchHit",&m_maxTouchHit);
	t+=dbg_decl("maxTouchReleased",&m_maxTouchReleased);
	t+=dbg_decl("minTouchDown",&m_minTouchDown);
	t+=dbg_decl("minTouchHit",&m_minTouchHit);
	t+=dbg_decl("minTouchReleased",&m_minTouchReleased);
	t+=dbg_decl("touchX",&m_touchX);
	t+=dbg_decl("touchY",&m_touchY);
	t+=dbg_decl("monitorTouch",&m_monitorTouch);
	t+=dbg_decl("currentTouchHit",&m_currentTouchHit);
	t+=dbg_decl("currentTouchDown",&m_currentTouchDown);
	t+=dbg_decl("currentTouchReleased",&m_currentTouchReleased);
	t+=dbg_decl("mouseHit",&m_mouseHit);
	t+=dbg_decl("mouseHitTime",&m_mouseHitTime);
	t+=dbg_decl("mouseDown",&m_mouseDown);
	t+=dbg_decl("mouseDownTime",&m_mouseDownTime);
	t+=dbg_decl("mouseReleased",&m_mouseReleased);
	t+=dbg_decl("mouseReleasedTime",&m_mouseReleasedTime);
	t+=dbg_decl("mouseX",&m_mouseX);
	t+=dbg_decl("mouseY",&m_mouseY);
	t+=dbg_decl("mouseDownCount",&m_mouseDownCount);
	t+=dbg_decl("mouseHitCount",&m_mouseHitCount);
	t+=dbg_decl("mouseReleasedCount",&m_mouseReleasedCount);
	t+=dbg_decl("monitorMouse",&m_monitorMouse);
	t+=dbg_decl("currentMouseHit",&m_currentMouseHit);
	t+=dbg_decl("currentMouseDown",&m_currentMouseDown);
	t+=dbg_decl("currentMouseReleased",&m_currentMouseReleased);
	t+=dbg_decl("keyHit",&m_keyHit);
	t+=dbg_decl("keyHitTime",&m_keyHitTime);
	t+=dbg_decl("keyDown",&m_keyDown);
	t+=dbg_decl("keyDownTime",&m_keyDownTime);
	t+=dbg_decl("keyReleased",&m_keyReleased);
	t+=dbg_decl("keyReleasedTime",&m_keyReleasedTime);
	t+=dbg_decl("keyDownCount",&m_keyDownCount);
	t+=dbg_decl("keyHitCount",&m_keyHitCount);
	t+=dbg_decl("keyReleasedCount",&m_keyReleasedCount);
	t+=dbg_decl("monitorKey",&m_monitorKey);
	t+=dbg_decl("monitorKeyCount",&m_monitorKeyCount);
	t+=dbg_decl("currentKeysHit",&m_currentKeysHit);
	t+=dbg_decl("currentKeysDown",&m_currentKeysDown);
	t+=dbg_decl("currentKeysReleased",&m_currentKeysReleased);
	t+=dbg_decl("touchData",&m_touchData);
	t+=dbg_decl("flingThreshold",&m_flingThreshold);
	t+=dbg_decl("longPressTime",&m_longPressTime);
	return t;
}
c_InputEventEnumerator::c_InputEventEnumerator(){
	m_ic=0;
	m_eventType=0;
}
c_InputEventEnumerator* c_InputEventEnumerator::m_new(c_InputCache* t_ic,int t_eventType){
	DBG_ENTER("InputEventEnumerator.new")
	c_InputEventEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_ic,"ic")
	DBG_LOCAL(t_eventType,"eventType")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<587>");
	gc_assign(this->m_ic,t_ic);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<588>");
	this->m_eventType=t_eventType;
	return this;
}
c_InputEventEnumerator* c_InputEventEnumerator::m_new2(){
	DBG_ENTER("InputEventEnumerator.new")
	c_InputEventEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<579>");
	return this;
}
void c_InputEventEnumerator::mark(){
	Object::mark();
	gc_mark_q(m_ic);
}
String c_InputEventEnumerator::debug(){
	String t="(InputEventEnumerator)\n";
	t+=dbg_decl("ic",&m_ic);
	t+=dbg_decl("eventType",&m_eventType);
	return t;
}
c_KeyEventEnumerator::c_KeyEventEnumerator(){
	m_event=0;
}
c_KeyEventEnumerator* c_KeyEventEnumerator::m_new(c_InputCache* t_ic,int t_eventType){
	DBG_ENTER("KeyEventEnumerator.new")
	c_KeyEventEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_ic,"ic")
	DBG_LOCAL(t_eventType,"eventType")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<603>");
	c_InputEventEnumerator::m_new(t_ic,t_eventType);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<604>");
	gc_assign(this->m_event,(new c_KeyEvent)->m_new2());
	return this;
}
c_KeyEventEnumerator* c_KeyEventEnumerator::m_new2(){
	DBG_ENTER("KeyEventEnumerator.new")
	c_KeyEventEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<597>");
	c_InputEventEnumerator::m_new2();
	return this;
}
void c_KeyEventEnumerator::mark(){
	c_InputEventEnumerator::mark();
	gc_mark_q(m_event);
}
String c_KeyEventEnumerator::debug(){
	String t="(KeyEventEnumerator)\n";
	t=c_InputEventEnumerator::debug()+t;
	t+=dbg_decl("event",&m_event);
	return t;
}
c_InputEvent::c_InputEvent(){
	m_eventType=0;
}
c_InputEvent* c_InputEvent::m_new(int t_eventType){
	DBG_ENTER("InputEvent.new")
	c_InputEvent *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_eventType,"eventType")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<554>");
	this->m_eventType=t_eventType;
	return this;
}
c_InputEvent* c_InputEvent::m_new2(){
	DBG_ENTER("InputEvent.new")
	c_InputEvent *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<528>");
	return this;
}
void c_InputEvent::mark(){
	Object::mark();
}
String c_InputEvent::debug(){
	String t="(InputEvent)\n";
	t+=dbg_decl("eventType",&m_eventType);
	return t;
}
c_KeyEvent::c_KeyEvent(){
}
c_KeyEvent* c_KeyEvent::m_new(int t_eventType){
	DBG_ENTER("KeyEvent.new")
	c_KeyEvent *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_eventType,"eventType")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<573>");
	c_InputEvent::m_new(t_eventType);
	return this;
}
c_KeyEvent* c_KeyEvent::m_new2(){
	DBG_ENTER("KeyEvent.new")
	c_KeyEvent *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<559>");
	c_InputEvent::m_new2();
	return this;
}
void c_KeyEvent::mark(){
	c_InputEvent::mark();
}
String c_KeyEvent::debug(){
	String t="(KeyEvent)\n";
	t=c_InputEvent::debug()+t;
	return t;
}
c_EnumWrapper::c_EnumWrapper(){
	m_wrappedEnum=0;
}
c_EnumWrapper* c_EnumWrapper::m_new(c_KeyEventEnumerator* t_wrappedEnum){
	DBG_ENTER("EnumWrapper.new")
	c_EnumWrapper *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_wrappedEnum,"wrappedEnum")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<644>");
	gc_assign(this->m_wrappedEnum,t_wrappedEnum);
	return this;
}
c_EnumWrapper* c_EnumWrapper::m_new2(){
	DBG_ENTER("EnumWrapper.new")
	c_EnumWrapper *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<638>");
	return this;
}
void c_EnumWrapper::mark(){
	Object::mark();
	gc_mark_q(m_wrappedEnum);
}
String c_EnumWrapper::debug(){
	String t="(EnumWrapper)\n";
	t+=dbg_decl("wrappedEnum",&m_wrappedEnum);
	return t;
}
c_TouchData::c_TouchData(){
	m_firstTouchX=0;
	m_firstTouchY=0;
	m_lastTouchX=0;
	m_lastTouchY=0;
	m_firstTouchTime=0;
	m_testedLongPress=false;
	m_firedLongPress=false;
	m_flingSamplesX=Array<int >(10);
	m_flingSamplesY=Array<int >(10);
	m_flingSamplesTime=Array<int >(10);
	m_flingSampleCount=0;
	m_flingSampleNext=0;
	m_movedTooFar=false;
	m_touchVelocityX=FLOAT(.0);
	m_touchVelocityY=FLOAT(.0);
	m_touchVelocitySpeed=FLOAT(.0);
	m_distanceMovedX=0;
	m_distanceMovedY=0;
}
c_TouchData* c_TouchData::m_new(){
	DBG_ENTER("TouchData.new")
	c_TouchData *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<664>");
	return this;
}
void c_TouchData::p_AddFlingSample(int t_x,int t_y){
	DBG_ENTER("TouchData.AddFlingSample")
	c_TouchData *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<711>");
	m_flingSamplesX.At(m_flingSampleNext)=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<712>");
	m_flingSamplesY.At(m_flingSampleNext)=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<713>");
	m_flingSamplesTime.At(m_flingSampleNext)=int(bb_framework_dt->m_currentticks);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<714>");
	if(m_flingSampleCount<10){
		DBG_BLOCK();
		m_flingSampleCount+=1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<715>");
	m_flingSampleNext+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<716>");
	if(m_flingSampleNext>=10){
		DBG_BLOCK();
		m_flingSampleNext=0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<719>");
	int t_first=m_flingSampleNext-m_flingSampleCount;
	DBG_LOCAL(t_first,"first")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<720>");
	int t_last=m_flingSampleNext-1;
	DBG_LOCAL(t_last,"last")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<721>");
	while(t_first<0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<722>");
		t_first+=10;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<724>");
	while(t_last<0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<725>");
		t_last+=10;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<729>");
	if(m_flingSampleCount>0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<731>");
		Float t_secs=Float(m_flingSamplesTime.At(t_last)-m_flingSamplesTime.At(t_first))/FLOAT(1000.0);
		DBG_LOCAL(t_secs,"secs")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<732>");
		m_touchVelocityX=Float(m_flingSamplesX.At(t_last)-m_flingSamplesX.At(t_first))/t_secs;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<733>");
		m_touchVelocityY=Float(m_flingSamplesY.At(t_last)-m_flingSamplesY.At(t_first))/t_secs;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<734>");
		m_touchVelocitySpeed=(Float)sqrt(m_touchVelocityX*m_touchVelocityX+m_touchVelocityY*m_touchVelocityY);
	}
}
void c_TouchData::p_Reset(int t_x,int t_y){
	DBG_ENTER("TouchData.Reset")
	c_TouchData *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<689>");
	m_firstTouchX=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<690>");
	m_firstTouchY=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<691>");
	m_lastTouchX=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<692>");
	m_lastTouchY=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<693>");
	m_firstTouchTime=int(bb_framework_dt->m_currentticks);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<694>");
	m_testedLongPress=false;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<695>");
	m_firedLongPress=false;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<696>");
	for(int t_i=0;t_i<10;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<697>");
		m_flingSamplesX.At(t_i)=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<698>");
		m_flingSamplesY.At(t_i)=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<699>");
		m_flingSamplesTime.At(t_i)=0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<701>");
	m_flingSampleCount=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<702>");
	m_flingSampleNext=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<703>");
	m_movedTooFar=false;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<704>");
	m_touchVelocityX=FLOAT(0.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<705>");
	m_touchVelocityY=FLOAT(0.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<706>");
	m_touchVelocitySpeed=FLOAT(0.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<707>");
	p_AddFlingSample(t_x,t_y);
}
void c_TouchData::p_Update3(int t_x,int t_y){
	DBG_ENTER("TouchData.Update")
	c_TouchData *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<740>");
	m_distanceMovedX=t_x-m_lastTouchX;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<741>");
	m_distanceMovedY=t_y-m_lastTouchY;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<742>");
	m_lastTouchX=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<743>");
	m_lastTouchY=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<745>");
	p_AddFlingSample(t_x,t_y);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<747>");
	if(!m_movedTooFar){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<749>");
		int t_dx=t_x-m_firstTouchX;
		DBG_LOCAL(t_dx,"dx")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<750>");
		int t_dy=t_y-m_firstTouchY;
		DBG_LOCAL(t_dy,"dy")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<751>");
		if(Float(t_dx*t_dx+t_dy*t_dy)>FLOAT(400.0)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/inputcache.monkey<752>");
			m_movedTooFar=true;
		}
	}
}
void c_TouchData::mark(){
	Object::mark();
	gc_mark_q(m_flingSamplesX);
	gc_mark_q(m_flingSamplesY);
	gc_mark_q(m_flingSamplesTime);
}
String c_TouchData::debug(){
	String t="(TouchData)\n";
	t+=dbg_decl("firstTouchX",&m_firstTouchX);
	t+=dbg_decl("firstTouchY",&m_firstTouchY);
	t+=dbg_decl("firstTouchTime",&m_firstTouchTime);
	t+=dbg_decl("lastTouchX",&m_lastTouchX);
	t+=dbg_decl("lastTouchY",&m_lastTouchY);
	t+=dbg_decl("flingSamplesX",&m_flingSamplesX);
	t+=dbg_decl("flingSamplesY",&m_flingSamplesY);
	t+=dbg_decl("flingSamplesTime",&m_flingSamplesTime);
	t+=dbg_decl("flingSampleCount",&m_flingSampleCount);
	t+=dbg_decl("flingSampleNext",&m_flingSampleNext);
	t+=dbg_decl("movedTooFar",&m_movedTooFar);
	t+=dbg_decl("testedLongPress",&m_testedLongPress);
	t+=dbg_decl("firedLongPress",&m_firedLongPress);
	t+=dbg_decl("distanceMovedX",&m_distanceMovedX);
	t+=dbg_decl("distanceMovedY",&m_distanceMovedY);
	t+=dbg_decl("touchVelocityX",&m_touchVelocityX);
	t+=dbg_decl("touchVelocityY",&m_touchVelocityY);
	t+=dbg_decl("touchVelocitySpeed",&m_touchVelocitySpeed);
	return t;
}
c_DiddyMouse::c_DiddyMouse(){
	m_lastX=0;
	m_lastY=0;
}
c_DiddyMouse* c_DiddyMouse::m_new(){
	DBG_ENTER("DiddyMouse.new")
	c_DiddyMouse *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2139>");
	diddy::mouseZInit();
	return this;
}
void c_DiddyMouse::p_Update2(){
	DBG_ENTER("DiddyMouse.Update")
	c_DiddyMouse *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2154>");
	m_lastX=bb_framework_diddyGame->m_mouseX;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2155>");
	m_lastY=bb_framework_diddyGame->m_mouseY;
}
void c_DiddyMouse::mark(){
	Object::mark();
}
String c_DiddyMouse::debug(){
	String t="(DiddyMouse)\n";
	t+=dbg_decl("lastX",&m_lastX);
	t+=dbg_decl("lastY",&m_lastY);
	return t;
}
int bbMain(){
	DBG_ENTER("Main")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyShooter.monkey<14>");
	(new c_Game)->m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyShooter.monkey<15>");
	return 0;
}
c_ConstInfo::c_ConstInfo(){
}
void c_ConstInfo::mark(){
	Object::mark();
}
String c_ConstInfo::debug(){
	String t="(ConstInfo)\n";
	return t;
}
c_Stack::c_Stack(){
	m_data=Array<c_ConstInfo* >();
	m_length=0;
}
c_Stack* c_Stack::m_new(){
	DBG_ENTER("Stack.new")
	c_Stack *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Stack* c_Stack::m_new2(Array<c_ConstInfo* > t_data){
	DBG_ENTER("Stack.new")
	c_Stack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>");
	gc_assign(this->m_data,t_data.Slice(0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>");
	this->m_length=t_data.Length();
	return this;
}
void c_Stack::p_Push(c_ConstInfo* t_value){
	DBG_ENTER("Stack.Push")
	c_Stack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>");
	if(m_length==m_data.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>");
		gc_assign(m_data,m_data.Resize(m_length*2+10));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>");
	gc_assign(m_data.At(m_length),t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>");
	m_length+=1;
}
void c_Stack::p_Push2(Array<c_ConstInfo* > t_values,int t_offset,int t_count){
	DBG_ENTER("Stack.Push")
	c_Stack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_LOCAL(t_count,"count")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>");
	for(int t_i=0;t_i<t_count;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>");
		p_Push(t_values.At(t_offset+t_i));
	}
}
void c_Stack::p_Push3(Array<c_ConstInfo* > t_values,int t_offset){
	DBG_ENTER("Stack.Push")
	c_Stack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>");
	p_Push2(t_values,t_offset,t_values.Length()-t_offset);
}
Array<c_ConstInfo* > c_Stack::p_ToArray(){
	DBG_ENTER("Stack.ToArray")
	c_Stack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>");
	Array<c_ConstInfo* > t_t=Array<c_ConstInfo* >(m_length);
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>");
	for(int t_i=0;t_i<m_length;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>");
		gc_assign(t_t.At(t_i),m_data.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>");
	return t_t;
}
void c_Stack::mark(){
	Object::mark();
	gc_mark_q(m_data);
}
String c_Stack::debug(){
	String t="(Stack)\n";
	t+=dbg_decl("data",&m_data);
	t+=dbg_decl("length",&m_length);
	return t;
}
c_FieldInfo::c_FieldInfo(){
	m__name=String();
	m__attrs=0;
	m__type=0;
}
c_FieldInfo* c_FieldInfo::m_new(String t_name,int t_attrs,c_ClassInfo* t_type){
	DBG_ENTER("FieldInfo.new")
	c_FieldInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_attrs,"attrs")
	DBG_LOCAL(t_type,"type")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<111>");
	m__name=t_name;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<112>");
	m__attrs=t_attrs;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<113>");
	gc_assign(m__type,t_type);
	return this;
}
c_FieldInfo* c_FieldInfo::m_new2(){
	DBG_ENTER("FieldInfo.new")
	c_FieldInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<108>");
	return this;
}
void c_FieldInfo::mark(){
	Object::mark();
	gc_mark_q(m__type);
}
String c_FieldInfo::debug(){
	String t="(FieldInfo)\n";
	t+=dbg_decl("_name",&m__name);
	t+=dbg_decl("_attrs",&m__attrs);
	t+=dbg_decl("_type",&m__type);
	return t;
}
c_Stack2::c_Stack2(){
	m_data=Array<c_FieldInfo* >();
	m_length=0;
}
c_Stack2* c_Stack2::m_new(){
	DBG_ENTER("Stack.new")
	c_Stack2 *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Stack2* c_Stack2::m_new2(Array<c_FieldInfo* > t_data){
	DBG_ENTER("Stack.new")
	c_Stack2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>");
	gc_assign(this->m_data,t_data.Slice(0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>");
	this->m_length=t_data.Length();
	return this;
}
void c_Stack2::p_Push4(c_FieldInfo* t_value){
	DBG_ENTER("Stack.Push")
	c_Stack2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>");
	if(m_length==m_data.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>");
		gc_assign(m_data,m_data.Resize(m_length*2+10));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>");
	gc_assign(m_data.At(m_length),t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>");
	m_length+=1;
}
void c_Stack2::p_Push5(Array<c_FieldInfo* > t_values,int t_offset,int t_count){
	DBG_ENTER("Stack.Push")
	c_Stack2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_LOCAL(t_count,"count")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>");
	for(int t_i=0;t_i<t_count;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>");
		p_Push4(t_values.At(t_offset+t_i));
	}
}
void c_Stack2::p_Push6(Array<c_FieldInfo* > t_values,int t_offset){
	DBG_ENTER("Stack.Push")
	c_Stack2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>");
	p_Push5(t_values,t_offset,t_values.Length()-t_offset);
}
Array<c_FieldInfo* > c_Stack2::p_ToArray(){
	DBG_ENTER("Stack.ToArray")
	c_Stack2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>");
	Array<c_FieldInfo* > t_t=Array<c_FieldInfo* >(m_length);
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>");
	for(int t_i=0;t_i<m_length;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>");
		gc_assign(t_t.At(t_i),m_data.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>");
	return t_t;
}
void c_Stack2::mark(){
	Object::mark();
	gc_mark_q(m_data);
}
String c_Stack2::debug(){
	String t="(Stack)\n";
	t+=dbg_decl("data",&m_data);
	t+=dbg_decl("length",&m_length);
	return t;
}
c_GlobalInfo::c_GlobalInfo(){
}
void c_GlobalInfo::mark(){
	Object::mark();
}
String c_GlobalInfo::debug(){
	String t="(GlobalInfo)\n";
	return t;
}
c_Stack3::c_Stack3(){
	m_data=Array<c_GlobalInfo* >();
	m_length=0;
}
c_Stack3* c_Stack3::m_new(){
	DBG_ENTER("Stack.new")
	c_Stack3 *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Stack3* c_Stack3::m_new2(Array<c_GlobalInfo* > t_data){
	DBG_ENTER("Stack.new")
	c_Stack3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>");
	gc_assign(this->m_data,t_data.Slice(0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>");
	this->m_length=t_data.Length();
	return this;
}
void c_Stack3::p_Push7(c_GlobalInfo* t_value){
	DBG_ENTER("Stack.Push")
	c_Stack3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>");
	if(m_length==m_data.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>");
		gc_assign(m_data,m_data.Resize(m_length*2+10));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>");
	gc_assign(m_data.At(m_length),t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>");
	m_length+=1;
}
void c_Stack3::p_Push8(Array<c_GlobalInfo* > t_values,int t_offset,int t_count){
	DBG_ENTER("Stack.Push")
	c_Stack3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_LOCAL(t_count,"count")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>");
	for(int t_i=0;t_i<t_count;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>");
		p_Push7(t_values.At(t_offset+t_i));
	}
}
void c_Stack3::p_Push9(Array<c_GlobalInfo* > t_values,int t_offset){
	DBG_ENTER("Stack.Push")
	c_Stack3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>");
	p_Push8(t_values,t_offset,t_values.Length()-t_offset);
}
Array<c_GlobalInfo* > c_Stack3::p_ToArray(){
	DBG_ENTER("Stack.ToArray")
	c_Stack3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>");
	Array<c_GlobalInfo* > t_t=Array<c_GlobalInfo* >(m_length);
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>");
	for(int t_i=0;t_i<m_length;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>");
		gc_assign(t_t.At(t_i),m_data.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>");
	return t_t;
}
void c_Stack3::mark(){
	Object::mark();
	gc_mark_q(m_data);
}
String c_Stack3::debug(){
	String t="(Stack)\n";
	t+=dbg_decl("data",&m_data);
	t+=dbg_decl("length",&m_length);
	return t;
}
c_MethodInfo::c_MethodInfo(){
	m__name=String();
	m__attrs=0;
	m__retType=0;
	m__argTypes=Array<c_ClassInfo* >();
}
c_MethodInfo* c_MethodInfo::m_new(String t_name,int t_attrs,c_ClassInfo* t_retType,Array<c_ClassInfo* > t_argTypes){
	DBG_ENTER("MethodInfo.new")
	c_MethodInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_attrs,"attrs")
	DBG_LOCAL(t_retType,"retType")
	DBG_LOCAL(t_argTypes,"argTypes")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<143>");
	m__name=t_name;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<144>");
	m__attrs=t_attrs;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<145>");
	gc_assign(m__retType,t_retType);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<146>");
	gc_assign(m__argTypes,t_argTypes);
	return this;
}
c_MethodInfo* c_MethodInfo::m_new2(){
	DBG_ENTER("MethodInfo.new")
	c_MethodInfo *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<140>");
	return this;
}
void c_MethodInfo::mark(){
	Object::mark();
	gc_mark_q(m__retType);
	gc_mark_q(m__argTypes);
}
String c_MethodInfo::debug(){
	String t="(MethodInfo)\n";
	t+=dbg_decl("_name",&m__name);
	t+=dbg_decl("_attrs",&m__attrs);
	t+=dbg_decl("_retType",&m__retType);
	t+=dbg_decl("_argTypes",&m__argTypes);
	return t;
}
c_Stack4::c_Stack4(){
	m_data=Array<c_MethodInfo* >();
	m_length=0;
}
c_Stack4* c_Stack4::m_new(){
	DBG_ENTER("Stack.new")
	c_Stack4 *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Stack4* c_Stack4::m_new2(Array<c_MethodInfo* > t_data){
	DBG_ENTER("Stack.new")
	c_Stack4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>");
	gc_assign(this->m_data,t_data.Slice(0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>");
	this->m_length=t_data.Length();
	return this;
}
void c_Stack4::p_Push10(c_MethodInfo* t_value){
	DBG_ENTER("Stack.Push")
	c_Stack4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>");
	if(m_length==m_data.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>");
		gc_assign(m_data,m_data.Resize(m_length*2+10));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>");
	gc_assign(m_data.At(m_length),t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>");
	m_length+=1;
}
void c_Stack4::p_Push11(Array<c_MethodInfo* > t_values,int t_offset,int t_count){
	DBG_ENTER("Stack.Push")
	c_Stack4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_LOCAL(t_count,"count")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>");
	for(int t_i=0;t_i<t_count;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>");
		p_Push10(t_values.At(t_offset+t_i));
	}
}
void c_Stack4::p_Push12(Array<c_MethodInfo* > t_values,int t_offset){
	DBG_ENTER("Stack.Push")
	c_Stack4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>");
	p_Push11(t_values,t_offset,t_values.Length()-t_offset);
}
Array<c_MethodInfo* > c_Stack4::p_ToArray(){
	DBG_ENTER("Stack.ToArray")
	c_Stack4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>");
	Array<c_MethodInfo* > t_t=Array<c_MethodInfo* >(m_length);
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>");
	for(int t_i=0;t_i<m_length;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>");
		gc_assign(t_t.At(t_i),m_data.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>");
	return t_t;
}
void c_Stack4::mark(){
	Object::mark();
	gc_mark_q(m_data);
}
String c_Stack4::debug(){
	String t="(Stack)\n";
	t+=dbg_decl("data",&m_data);
	t+=dbg_decl("length",&m_length);
	return t;
}
c_Stack5::c_Stack5(){
	m_data=Array<c_FunctionInfo* >();
	m_length=0;
}
c_Stack5* c_Stack5::m_new(){
	DBG_ENTER("Stack.new")
	c_Stack5 *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Stack5* c_Stack5::m_new2(Array<c_FunctionInfo* > t_data){
	DBG_ENTER("Stack.new")
	c_Stack5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>");
	gc_assign(this->m_data,t_data.Slice(0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>");
	this->m_length=t_data.Length();
	return this;
}
void c_Stack5::p_Push13(c_FunctionInfo* t_value){
	DBG_ENTER("Stack.Push")
	c_Stack5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>");
	if(m_length==m_data.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>");
		gc_assign(m_data,m_data.Resize(m_length*2+10));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>");
	gc_assign(m_data.At(m_length),t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>");
	m_length+=1;
}
void c_Stack5::p_Push14(Array<c_FunctionInfo* > t_values,int t_offset,int t_count){
	DBG_ENTER("Stack.Push")
	c_Stack5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_LOCAL(t_count,"count")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>");
	for(int t_i=0;t_i<t_count;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>");
		p_Push13(t_values.At(t_offset+t_i));
	}
}
void c_Stack5::p_Push15(Array<c_FunctionInfo* > t_values,int t_offset){
	DBG_ENTER("Stack.Push")
	c_Stack5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>");
	p_Push14(t_values,t_offset,t_values.Length()-t_offset);
}
Array<c_FunctionInfo* > c_Stack5::p_ToArray(){
	DBG_ENTER("Stack.ToArray")
	c_Stack5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>");
	Array<c_FunctionInfo* > t_t=Array<c_FunctionInfo* >(m_length);
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>");
	for(int t_i=0;t_i<m_length;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>");
		gc_assign(t_t.At(t_i),m_data.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>");
	return t_t;
}
void c_Stack5::mark(){
	Object::mark();
	gc_mark_q(m_data);
}
String c_Stack5::debug(){
	String t="(Stack)\n";
	t+=dbg_decl("data",&m_data);
	t+=dbg_decl("length",&m_length);
	return t;
}
c_R19::c_R19(){
}
c_R19* c_R19::m_new(){
	c_FieldInfo::m_new(String(L"message",7),2,bb_reflection__stringClass);
	return this;
}
void c_R19::mark(){
	c_FieldInfo::mark();
}
String c_R19::debug(){
	String t="(R19)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R20::c_R20(){
}
c_R20* c_R20::m_new(){
	c_FieldInfo::m_new(String(L"cause",5),2,bb_reflection__classes.At(1));
	return this;
}
void c_R20::mark(){
	c_FieldInfo::mark();
}
String c_R20::debug(){
	String t="(R20)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R21::c_R21(){
}
c_R21* c_R21::m_new(){
	c_FieldInfo::m_new(String(L"type",4),2,bb_reflection__stringClass);
	return this;
}
void c_R21::mark(){
	c_FieldInfo::mark();
}
String c_R21::debug(){
	String t="(R21)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R22::c_R22(){
}
c_R22* c_R22::m_new(){
	c_FieldInfo::m_new(String(L"fullType",8),2,bb_reflection__stringClass);
	return this;
}
void c_R22::mark(){
	c_FieldInfo::mark();
}
String c_R22::debug(){
	String t="(R22)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R23::c_R23(){
}
c_R23* c_R23::m_new(){
	c_MethodInfo::m_new(String(L"Message",7),8,bb_reflection__stringClass,Array<c_ClassInfo* >());
	return this;
}
void c_R23::mark(){
	c_MethodInfo::mark();
}
String c_R23::debug(){
	String t="(R23)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R24::c_R24(){
}
c_R24* c_R24::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass};
	c_MethodInfo::m_new(String(L"Message",7),8,0,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R24::mark(){
	c_MethodInfo::mark();
}
String c_R24::debug(){
	String t="(R24)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R25::c_R25(){
}
c_R25* c_R25::m_new(){
	c_MethodInfo::m_new(String(L"Cause",5),8,bb_reflection__classes.At(1),Array<c_ClassInfo* >());
	return this;
}
void c_R25::mark(){
	c_MethodInfo::mark();
}
String c_R25::debug(){
	String t="(R25)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R26::c_R26(){
}
c_R26* c_R26::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(1)};
	c_MethodInfo::m_new(String(L"Cause",5),8,0,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R26::mark(){
	c_MethodInfo::mark();
}
String c_R26::debug(){
	String t="(R26)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R27::c_R27(){
}
c_R27* c_R27::m_new(){
	c_MethodInfo::m_new(String(L"Type",4),8,bb_reflection__stringClass,Array<c_ClassInfo* >());
	return this;
}
void c_R27::mark(){
	c_MethodInfo::mark();
}
String c_R27::debug(){
	String t="(R27)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R28::c_R28(){
}
c_R28* c_R28::m_new(){
	c_MethodInfo::m_new(String(L"FullType",8),8,bb_reflection__stringClass,Array<c_ClassInfo* >());
	return this;
}
void c_R28::mark(){
	c_MethodInfo::mark();
}
String c_R28::debug(){
	String t="(R28)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R30::c_R30(){
}
c_R30* c_R30::m_new(){
	c_ClassInfo* t_[]={bb_reflection__boolClass};
	c_MethodInfo::m_new(String(L"ToString",8),0,bb_reflection__stringClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R30::mark(){
	c_MethodInfo::mark();
}
String c_R30::debug(){
	String t="(R30)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R29::c_R29(){
}
c_R29* c_R29::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass,bb_reflection__classes.At(1)};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(2),Array<c_ClassInfo* >(t_,2));
	return this;
}
void c_R29::mark(){
	c_FunctionInfo::mark();
}
String c_R29::debug(){
	String t="(R29)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R32::c_R32(){
}
c_R32* c_R32::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass,bb_reflection__classes.At(1)};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(3),Array<c_ClassInfo* >(t_,2));
	return this;
}
void c_R32::mark(){
	c_FunctionInfo::mark();
}
String c_R32::debug(){
	String t="(R32)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R34::c_R34(){
}
c_R34* c_R34::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass,bb_reflection__classes.At(1)};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(4),Array<c_ClassInfo* >(t_,2));
	return this;
}
void c_R34::mark(){
	c_FunctionInfo::mark();
}
String c_R34::debug(){
	String t="(R34)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R36::c_R36(){
}
c_R36* c_R36::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass,bb_reflection__classes.At(1)};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(5),Array<c_ClassInfo* >(t_,2));
	return this;
}
void c_R36::mark(){
	c_FunctionInfo::mark();
}
String c_R36::debug(){
	String t="(R36)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R38::c_R38(){
}
c_R38* c_R38::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass,bb_reflection__classes.At(1)};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(6),Array<c_ClassInfo* >(t_,2));
	return this;
}
void c_R38::mark(){
	c_FunctionInfo::mark();
}
String c_R38::debug(){
	String t="(R38)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R40::c_R40(){
}
c_R40* c_R40::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass,bb_reflection__classes.At(1)};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(7),Array<c_ClassInfo* >(t_,2));
	return this;
}
void c_R40::mark(){
	c_FunctionInfo::mark();
}
String c_R40::debug(){
	String t="(R40)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R42::c_R42(){
}
c_R42* c_R42::m_new(){
	c_FieldInfo::m_new(String(L"value",5),0,bb_reflection__boolClass);
	return this;
}
void c_R42::mark(){
	c_FieldInfo::mark();
}
String c_R42::debug(){
	String t="(R42)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R44::c_R44(){
}
c_R44* c_R44::m_new(){
	c_MethodInfo::m_new(String(L"ToBool",6),0,bb_reflection__boolClass,Array<c_ClassInfo* >());
	return this;
}
void c_R44::mark(){
	c_MethodInfo::mark();
}
String c_R44::debug(){
	String t="(R44)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R45::c_R45(){
}
c_R45* c_R45::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(8)};
	c_MethodInfo::m_new(String(L"Equals",6),0,bb_reflection__boolClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R45::mark(){
	c_MethodInfo::mark();
}
String c_R45::debug(){
	String t="(R45)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R43::c_R43(){
}
c_R43* c_R43::m_new(){
	c_ClassInfo* t_[]={bb_reflection__boolClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(8),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R43::mark(){
	c_FunctionInfo::mark();
}
String c_R43::debug(){
	String t="(R43)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R46::c_R46(){
}
c_R46* c_R46::m_new(){
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(8),Array<c_ClassInfo* >());
	return this;
}
void c_R46::mark(){
	c_FunctionInfo::mark();
}
String c_R46::debug(){
	String t="(R46)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R48::c_R48(){
}
c_R48* c_R48::m_new(){
	c_FieldInfo::m_new(String(L"value",5),0,bb_reflection__intClass);
	return this;
}
void c_R48::mark(){
	c_FieldInfo::mark();
}
String c_R48::debug(){
	String t="(R48)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R51::c_R51(){
}
c_R51* c_R51::m_new(){
	c_MethodInfo::m_new(String(L"ToInt",5),0,bb_reflection__intClass,Array<c_ClassInfo* >());
	return this;
}
void c_R51::mark(){
	c_MethodInfo::mark();
}
String c_R51::debug(){
	String t="(R51)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R52::c_R52(){
}
c_R52* c_R52::m_new(){
	c_MethodInfo::m_new(String(L"ToFloat",7),0,bb_reflection__floatClass,Array<c_ClassInfo* >());
	return this;
}
void c_R52::mark(){
	c_MethodInfo::mark();
}
String c_R52::debug(){
	String t="(R52)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R53::c_R53(){
}
c_R53* c_R53::m_new(){
	c_MethodInfo::m_new(String(L"ToString",8),0,bb_reflection__stringClass,Array<c_ClassInfo* >());
	return this;
}
void c_R53::mark(){
	c_MethodInfo::mark();
}
String c_R53::debug(){
	String t="(R53)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R54::c_R54(){
}
c_R54* c_R54::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(9)};
	c_MethodInfo::m_new(String(L"Equals",6),0,bb_reflection__boolClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R54::mark(){
	c_MethodInfo::mark();
}
String c_R54::debug(){
	String t="(R54)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R55::c_R55(){
}
c_R55* c_R55::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(9)};
	c_MethodInfo::m_new(String(L"Compare",7),0,bb_reflection__intClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R55::mark(){
	c_MethodInfo::mark();
}
String c_R55::debug(){
	String t="(R55)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R49::c_R49(){
}
c_R49* c_R49::m_new(){
	c_ClassInfo* t_[]={bb_reflection__intClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(9),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R49::mark(){
	c_FunctionInfo::mark();
}
String c_R49::debug(){
	String t="(R49)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R50::c_R50(){
}
c_R50* c_R50::m_new(){
	c_ClassInfo* t_[]={bb_reflection__floatClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(9),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R50::mark(){
	c_FunctionInfo::mark();
}
String c_R50::debug(){
	String t="(R50)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R56::c_R56(){
}
c_R56* c_R56::m_new(){
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(9),Array<c_ClassInfo* >());
	return this;
}
void c_R56::mark(){
	c_FunctionInfo::mark();
}
String c_R56::debug(){
	String t="(R56)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R58::c_R58(){
}
c_R58* c_R58::m_new(){
	c_FieldInfo::m_new(String(L"value",5),0,bb_reflection__floatClass);
	return this;
}
void c_R58::mark(){
	c_FieldInfo::mark();
}
String c_R58::debug(){
	String t="(R58)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R61::c_R61(){
}
c_R61* c_R61::m_new(){
	c_MethodInfo::m_new(String(L"ToInt",5),0,bb_reflection__intClass,Array<c_ClassInfo* >());
	return this;
}
void c_R61::mark(){
	c_MethodInfo::mark();
}
String c_R61::debug(){
	String t="(R61)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R62::c_R62(){
}
c_R62* c_R62::m_new(){
	c_MethodInfo::m_new(String(L"ToFloat",7),0,bb_reflection__floatClass,Array<c_ClassInfo* >());
	return this;
}
void c_R62::mark(){
	c_MethodInfo::mark();
}
String c_R62::debug(){
	String t="(R62)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R63::c_R63(){
}
c_R63* c_R63::m_new(){
	c_MethodInfo::m_new(String(L"ToString",8),0,bb_reflection__stringClass,Array<c_ClassInfo* >());
	return this;
}
void c_R63::mark(){
	c_MethodInfo::mark();
}
String c_R63::debug(){
	String t="(R63)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R64::c_R64(){
}
c_R64* c_R64::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(10)};
	c_MethodInfo::m_new(String(L"Equals",6),0,bb_reflection__boolClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R64::mark(){
	c_MethodInfo::mark();
}
String c_R64::debug(){
	String t="(R64)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R65::c_R65(){
}
c_R65* c_R65::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(10)};
	c_MethodInfo::m_new(String(L"Compare",7),0,bb_reflection__intClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R65::mark(){
	c_MethodInfo::mark();
}
String c_R65::debug(){
	String t="(R65)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R59::c_R59(){
}
c_R59* c_R59::m_new(){
	c_ClassInfo* t_[]={bb_reflection__intClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(10),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R59::mark(){
	c_FunctionInfo::mark();
}
String c_R59::debug(){
	String t="(R59)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R60::c_R60(){
}
c_R60* c_R60::m_new(){
	c_ClassInfo* t_[]={bb_reflection__floatClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(10),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R60::mark(){
	c_FunctionInfo::mark();
}
String c_R60::debug(){
	String t="(R60)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R66::c_R66(){
}
c_R66* c_R66::m_new(){
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(10),Array<c_ClassInfo* >());
	return this;
}
void c_R66::mark(){
	c_FunctionInfo::mark();
}
String c_R66::debug(){
	String t="(R66)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R68::c_R68(){
}
c_R68* c_R68::m_new(){
	c_FieldInfo::m_new(String(L"value",5),0,bb_reflection__stringClass);
	return this;
}
void c_R68::mark(){
	c_FieldInfo::mark();
}
String c_R68::debug(){
	String t="(R68)\n";
	t=c_FieldInfo::debug()+t;
	return t;
}
c_R72::c_R72(){
}
c_R72* c_R72::m_new(){
	c_MethodInfo::m_new(String(L"ToString",8),0,bb_reflection__stringClass,Array<c_ClassInfo* >());
	return this;
}
void c_R72::mark(){
	c_MethodInfo::mark();
}
String c_R72::debug(){
	String t="(R72)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R73::c_R73(){
}
c_R73* c_R73::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(11)};
	c_MethodInfo::m_new(String(L"Equals",6),0,bb_reflection__boolClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R73::mark(){
	c_MethodInfo::mark();
}
String c_R73::debug(){
	String t="(R73)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R74::c_R74(){
}
c_R74* c_R74::m_new(){
	c_ClassInfo* t_[]={bb_reflection__classes.At(11)};
	c_MethodInfo::m_new(String(L"Compare",7),0,bb_reflection__intClass,Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R74::mark(){
	c_MethodInfo::mark();
}
String c_R74::debug(){
	String t="(R74)\n";
	t=c_MethodInfo::debug()+t;
	return t;
}
c_R69::c_R69(){
}
c_R69* c_R69::m_new(){
	c_ClassInfo* t_[]={bb_reflection__intClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(11),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R69::mark(){
	c_FunctionInfo::mark();
}
String c_R69::debug(){
	String t="(R69)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R70::c_R70(){
}
c_R70* c_R70::m_new(){
	c_ClassInfo* t_[]={bb_reflection__floatClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(11),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R70::mark(){
	c_FunctionInfo::mark();
}
String c_R70::debug(){
	String t="(R70)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R71::c_R71(){
}
c_R71* c_R71::m_new(){
	c_ClassInfo* t_[]={bb_reflection__stringClass};
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(11),Array<c_ClassInfo* >(t_,1));
	return this;
}
void c_R71::mark(){
	c_FunctionInfo::mark();
}
String c_R71::debug(){
	String t="(R71)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_R75::c_R75(){
}
c_R75* c_R75::m_new(){
	c_FunctionInfo::m_new(String(L"new",3),0,bb_reflection__classes.At(11),Array<c_ClassInfo* >());
	return this;
}
void c_R75::mark(){
	c_FunctionInfo::mark();
}
String c_R75::debug(){
	String t="(R75)\n";
	t=c_FunctionInfo::debug()+t;
	return t;
}
c_UnknownClass::c_UnknownClass(){
}
c_UnknownClass* c_UnknownClass::m_new(){
	DBG_ENTER("UnknownClass.new")
	c_UnknownClass *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/reflection/reflection.monkey<625>");
	c_ClassInfo::m_new(String(L"?",1),0,0,Array<c_ClassInfo* >());
	return this;
}
void c_UnknownClass::mark(){
	c_ClassInfo::mark();
}
String c_UnknownClass::debug(){
	String t="(UnknownClass)\n";
	t=c_ClassInfo::debug()+t;
	return t;
}
c_ClassInfo* bb_reflection__unknownClass;
gxtkGraphics* bb_graphics_device;
int bb_graphics_SetGraphicsDevice(gxtkGraphics* t_dev){
	DBG_ENTER("SetGraphicsDevice")
	DBG_LOCAL(t_dev,"dev")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<59>");
	gc_assign(bb_graphics_device,t_dev);
	return 0;
}
c_Image::c_Image(){
	m_surface=0;
	m_width=0;
	m_height=0;
	m_frames=Array<c_Frame* >();
	m_flags=0;
	m_tx=FLOAT(.0);
	m_ty=FLOAT(.0);
	m_source=0;
}
int c_Image::m_DefaultFlags;
c_Image* c_Image::m_new(){
	DBG_ENTER("Image.new")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<66>");
	return this;
}
int c_Image::p_SetHandle(Float t_tx,Float t_ty){
	DBG_ENTER("Image.SetHandle")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_tx,"tx")
	DBG_LOCAL(t_ty,"ty")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<110>");
	this->m_tx=t_tx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<111>");
	this->m_ty=t_ty;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<112>");
	this->m_flags=this->m_flags&-2;
	return 0;
}
int c_Image::p_ApplyFlags(int t_iflags){
	DBG_ENTER("Image.ApplyFlags")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_iflags,"iflags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<188>");
	m_flags=t_iflags;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<190>");
	if((m_flags&2)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<191>");
		Array<c_Frame* > t_=m_frames;
		int t_2=0;
		while(t_2<t_.Length()){
			DBG_BLOCK();
			c_Frame* t_f=t_.At(t_2);
			t_2=t_2+1;
			DBG_LOCAL(t_f,"f")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<192>");
			t_f->m_x+=1;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<194>");
		m_width-=2;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<197>");
	if((m_flags&4)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<198>");
		Array<c_Frame* > t_3=m_frames;
		int t_4=0;
		while(t_4<t_3.Length()){
			DBG_BLOCK();
			c_Frame* t_f2=t_3.At(t_4);
			t_4=t_4+1;
			DBG_LOCAL(t_f2,"f")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<199>");
			t_f2->m_y+=1;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<201>");
		m_height-=2;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<204>");
	if((m_flags&1)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<205>");
		p_SetHandle(Float(m_width)/FLOAT(2.0),Float(m_height)/FLOAT(2.0));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<208>");
	if(m_frames.Length()==1 && m_frames.At(0)->m_x==0 && m_frames.At(0)->m_y==0 && m_width==m_surface->Width() && m_height==m_surface->Height()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<209>");
		m_flags|=65536;
	}
	return 0;
}
c_Image* c_Image::p_Init2(gxtkSurface* t_surf,int t_nframes,int t_iflags){
	DBG_ENTER("Image.Init")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_surf,"surf")
	DBG_LOCAL(t_nframes,"nframes")
	DBG_LOCAL(t_iflags,"iflags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<146>");
	gc_assign(m_surface,t_surf);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<148>");
	m_width=m_surface->Width()/t_nframes;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<149>");
	m_height=m_surface->Height();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<151>");
	gc_assign(m_frames,Array<c_Frame* >(t_nframes));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<152>");
	for(int t_i=0;t_i<t_nframes;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<153>");
		gc_assign(m_frames.At(t_i),(new c_Frame)->m_new(t_i*m_width,0));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<156>");
	p_ApplyFlags(t_iflags);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<157>");
	return this;
}
c_Image* c_Image::p_Init3(gxtkSurface* t_surf,int t_x,int t_y,int t_iwidth,int t_iheight,int t_nframes,int t_iflags,c_Image* t_src,int t_srcx,int t_srcy,int t_srcw,int t_srch){
	DBG_ENTER("Image.Init")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_surf,"surf")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_iwidth,"iwidth")
	DBG_LOCAL(t_iheight,"iheight")
	DBG_LOCAL(t_nframes,"nframes")
	DBG_LOCAL(t_iflags,"iflags")
	DBG_LOCAL(t_src,"src")
	DBG_LOCAL(t_srcx,"srcx")
	DBG_LOCAL(t_srcy,"srcy")
	DBG_LOCAL(t_srcw,"srcw")
	DBG_LOCAL(t_srch,"srch")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<161>");
	gc_assign(m_surface,t_surf);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<162>");
	gc_assign(m_source,t_src);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<164>");
	m_width=t_iwidth;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<165>");
	m_height=t_iheight;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<167>");
	gc_assign(m_frames,Array<c_Frame* >(t_nframes));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<169>");
	int t_ix=t_x;
	int t_iy=t_y;
	DBG_LOCAL(t_ix,"ix")
	DBG_LOCAL(t_iy,"iy")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<171>");
	for(int t_i=0;t_i<t_nframes;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<172>");
		if(t_ix+m_width>t_srcw){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<173>");
			t_ix=0;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<174>");
			t_iy+=m_height;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<176>");
		if(t_ix+m_width>t_srcw || t_iy+m_height>t_srch){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<177>");
			bbError(String(L"Image frame outside surface",27));
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<179>");
		gc_assign(m_frames.At(t_i),(new c_Frame)->m_new(t_ix+t_srcx,t_iy+t_srcy));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<180>");
		t_ix+=m_width;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<183>");
	p_ApplyFlags(t_iflags);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<184>");
	return this;
}
Float c_Image::p_HandleX(){
	DBG_ENTER("Image.HandleX")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<97>");
	return m_tx;
}
Float c_Image::p_HandleY(){
	DBG_ENTER("Image.HandleY")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<101>");
	return m_ty;
}
int c_Image::p_Width(){
	DBG_ENTER("Image.Width")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<77>");
	return m_width;
}
int c_Image::p_Height(){
	DBG_ENTER("Image.Height")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<81>");
	return m_height;
}
int c_Image::p_Frames(){
	DBG_ENTER("Image.Frames")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<89>");
	int t_=m_frames.Length();
	return t_;
}
c_Image* c_Image::p_GrabImage(int t_x,int t_y,int t_width,int t_height,int t_nframes,int t_flags){
	DBG_ENTER("Image.GrabImage")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_width,"width")
	DBG_LOCAL(t_height,"height")
	DBG_LOCAL(t_nframes,"nframes")
	DBG_LOCAL(t_flags,"flags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<105>");
	if(m_frames.Length()!=1){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<106>");
	c_Image* t_=((new c_Image)->m_new())->p_Init3(m_surface,t_x,t_y,t_width,t_height,t_nframes,t_flags,this,m_frames.At(0)->m_x,m_frames.At(0)->m_y,this->m_width,this->m_height);
	return t_;
}
int c_Image::p_Discard(){
	DBG_ENTER("Image.Discard")
	c_Image *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<116>");
	if(((m_surface)!=0) && !((m_source)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<117>");
		m_surface->Discard();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<118>");
		m_surface=0;
	}
	return 0;
}
void c_Image::mark(){
	Object::mark();
	gc_mark_q(m_surface);
	gc_mark_q(m_frames);
	gc_mark_q(m_source);
}
String c_Image::debug(){
	String t="(Image)\n";
	t+=dbg_decl("DefaultFlags",&c_Image::m_DefaultFlags);
	t+=dbg_decl("source",&m_source);
	t+=dbg_decl("surface",&m_surface);
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("height",&m_height);
	t+=dbg_decl("flags",&m_flags);
	t+=dbg_decl("frames",&m_frames);
	t+=dbg_decl("tx",&m_tx);
	t+=dbg_decl("ty",&m_ty);
	return t;
}
c_GraphicsContext::c_GraphicsContext(){
	m_defaultFont=0;
	m_font=0;
	m_firstChar=0;
	m_matrixSp=0;
	m_ix=FLOAT(1.0);
	m_iy=FLOAT(.0);
	m_jx=FLOAT(.0);
	m_jy=FLOAT(1.0);
	m_tx=FLOAT(.0);
	m_ty=FLOAT(.0);
	m_tformed=0;
	m_matDirty=0;
	m_color_r=FLOAT(.0);
	m_color_g=FLOAT(.0);
	m_color_b=FLOAT(.0);
	m_alpha=FLOAT(.0);
	m_blend=0;
	m_scissor_x=FLOAT(.0);
	m_scissor_y=FLOAT(.0);
	m_scissor_width=FLOAT(.0);
	m_scissor_height=FLOAT(.0);
	m_matrixStack=Array<Float >(192);
}
c_GraphicsContext* c_GraphicsContext::m_new(){
	DBG_ENTER("GraphicsContext.new")
	c_GraphicsContext *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<25>");
	return this;
}
int c_GraphicsContext::p_Validate(){
	DBG_ENTER("GraphicsContext.Validate")
	c_GraphicsContext *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<36>");
	if((m_matDirty)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<37>");
		bb_graphics_renderDevice->SetMatrix(bb_graphics_context->m_ix,bb_graphics_context->m_iy,bb_graphics_context->m_jx,bb_graphics_context->m_jy,bb_graphics_context->m_tx,bb_graphics_context->m_ty);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<38>");
		m_matDirty=0;
	}
	return 0;
}
void c_GraphicsContext::mark(){
	Object::mark();
	gc_mark_q(m_defaultFont);
	gc_mark_q(m_font);
	gc_mark_q(m_matrixStack);
}
String c_GraphicsContext::debug(){
	String t="(GraphicsContext)\n";
	t+=dbg_decl("color_r",&m_color_r);
	t+=dbg_decl("color_g",&m_color_g);
	t+=dbg_decl("color_b",&m_color_b);
	t+=dbg_decl("alpha",&m_alpha);
	t+=dbg_decl("blend",&m_blend);
	t+=dbg_decl("ix",&m_ix);
	t+=dbg_decl("iy",&m_iy);
	t+=dbg_decl("jx",&m_jx);
	t+=dbg_decl("jy",&m_jy);
	t+=dbg_decl("tx",&m_tx);
	t+=dbg_decl("ty",&m_ty);
	t+=dbg_decl("tformed",&m_tformed);
	t+=dbg_decl("matDirty",&m_matDirty);
	t+=dbg_decl("scissor_x",&m_scissor_x);
	t+=dbg_decl("scissor_y",&m_scissor_y);
	t+=dbg_decl("scissor_width",&m_scissor_width);
	t+=dbg_decl("scissor_height",&m_scissor_height);
	t+=dbg_decl("matrixStack",&m_matrixStack);
	t+=dbg_decl("matrixSp",&m_matrixSp);
	t+=dbg_decl("font",&m_font);
	t+=dbg_decl("firstChar",&m_firstChar);
	t+=dbg_decl("defaultFont",&m_defaultFont);
	return t;
}
c_GraphicsContext* bb_graphics_context;
String bb_data_FixDataPath(String t_path){
	DBG_ENTER("FixDataPath")
	DBG_LOCAL(t_path,"path")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<3>");
	int t_i=t_path.Find(String(L":/",2),0);
	DBG_LOCAL(t_i,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<4>");
	if(t_i!=-1 && t_path.Find(String(L"/",1),0)==t_i+1){
		DBG_BLOCK();
		return t_path;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<5>");
	if(t_path.StartsWith(String(L"./",2)) || t_path.StartsWith(String(L"/",1))){
		DBG_BLOCK();
		return t_path;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/data.monkey<6>");
	String t_=String(L"monkey://data/",14)+t_path;
	return t_;
}
c_Frame::c_Frame(){
	m_x=0;
	m_y=0;
}
c_Frame* c_Frame::m_new(int t_x,int t_y){
	DBG_ENTER("Frame.new")
	c_Frame *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<19>");
	this->m_x=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<20>");
	this->m_y=t_y;
	return this;
}
c_Frame* c_Frame::m_new2(){
	DBG_ENTER("Frame.new")
	c_Frame *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<14>");
	return this;
}
void c_Frame::mark(){
	Object::mark();
}
String c_Frame::debug(){
	String t="(Frame)\n";
	t+=dbg_decl("x",&m_x);
	t+=dbg_decl("y",&m_y);
	return t;
}
c_Image* bb_graphics_LoadImage(String t_path,int t_frameCount,int t_flags){
	DBG_ENTER("LoadImage")
	DBG_LOCAL(t_path,"path")
	DBG_LOCAL(t_frameCount,"frameCount")
	DBG_LOCAL(t_flags,"flags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<238>");
	gxtkSurface* t_surf=bb_graphics_device->LoadSurface(bb_data_FixDataPath(t_path));
	DBG_LOCAL(t_surf,"surf")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<239>");
	if((t_surf)!=0){
		DBG_BLOCK();
		c_Image* t_=((new c_Image)->m_new())->p_Init2(t_surf,t_frameCount,t_flags);
		return t_;
	}
	return 0;
}
c_Image* bb_graphics_LoadImage2(String t_path,int t_frameWidth,int t_frameHeight,int t_frameCount,int t_flags){
	DBG_ENTER("LoadImage")
	DBG_LOCAL(t_path,"path")
	DBG_LOCAL(t_frameWidth,"frameWidth")
	DBG_LOCAL(t_frameHeight,"frameHeight")
	DBG_LOCAL(t_frameCount,"frameCount")
	DBG_LOCAL(t_flags,"flags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<243>");
	gxtkSurface* t_surf=bb_graphics_device->LoadSurface(bb_data_FixDataPath(t_path));
	DBG_LOCAL(t_surf,"surf")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<244>");
	if((t_surf)!=0){
		DBG_BLOCK();
		c_Image* t_=((new c_Image)->m_new())->p_Init3(t_surf,0,0,t_frameWidth,t_frameHeight,t_frameCount,t_flags,0,0,0,t_surf->Width(),t_surf->Height());
		return t_;
	}
	return 0;
}
int bb_graphics_SetFont(c_Image* t_font,int t_firstChar){
	DBG_ENTER("SetFont")
	DBG_LOCAL(t_font,"font")
	DBG_LOCAL(t_firstChar,"firstChar")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<545>");
	if(!((t_font)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<546>");
		if(!((bb_graphics_context->m_defaultFont)!=0)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<547>");
			gc_assign(bb_graphics_context->m_defaultFont,bb_graphics_LoadImage(String(L"mojo_font.png",13),96,2));
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<549>");
		t_font=bb_graphics_context->m_defaultFont;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<550>");
		t_firstChar=32;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<552>");
	gc_assign(bb_graphics_context->m_font,t_font);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<553>");
	bb_graphics_context->m_firstChar=t_firstChar;
	return 0;
}
gxtkAudio* bb_audio_device;
int bb_audio_SetAudioDevice(gxtkAudio* t_dev){
	DBG_ENTER("SetAudioDevice")
	DBG_LOCAL(t_dev,"dev")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<18>");
	gc_assign(bb_audio_device,t_dev);
	return 0;
}
c_InputDevice::c_InputDevice(){
	m__joyStates=Array<c_JoyState* >(4);
	m__keyDown=Array<bool >(512);
	m__keyHitPut=0;
	m__keyHitQueue=Array<int >(33);
	m__keyHit=Array<int >(512);
	m__charGet=0;
	m__charPut=0;
	m__charQueue=Array<int >(32);
	m__mouseX=FLOAT(.0);
	m__mouseY=FLOAT(.0);
	m__touchX=Array<Float >(32);
	m__touchY=Array<Float >(32);
	m__accelX=FLOAT(.0);
	m__accelY=FLOAT(.0);
	m__accelZ=FLOAT(.0);
}
c_InputDevice* c_InputDevice::m_new(){
	DBG_ENTER("InputDevice.new")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<22>");
	for(int t_i=0;t_i<4;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<23>");
		gc_assign(m__joyStates.At(t_i),(new c_JoyState)->m_new());
	}
	return this;
}
void c_InputDevice::p_PutKeyHit(int t_key){
	DBG_ENTER("InputDevice.PutKeyHit")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<233>");
	if(m__keyHitPut==m__keyHitQueue.Length()){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<234>");
	m__keyHit.At(t_key)+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<235>");
	m__keyHitQueue.At(m__keyHitPut)=t_key;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<236>");
	m__keyHitPut+=1;
}
void c_InputDevice::p_BeginUpdate(){
	DBG_ENTER("InputDevice.BeginUpdate")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<185>");
	for(int t_i=0;t_i<4;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<186>");
		c_JoyState* t_state=m__joyStates.At(t_i);
		DBG_LOCAL(t_state,"state")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<187>");
		if(!BBGame::Game()->PollJoystick(t_i,t_state->m_joyx,t_state->m_joyy,t_state->m_joyz,t_state->m_buttons)){
			DBG_BLOCK();
			break;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<188>");
		for(int t_j=0;t_j<32;t_j=t_j+1){
			DBG_BLOCK();
			DBG_LOCAL(t_j,"j")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<189>");
			int t_key=256+t_i*32+t_j;
			DBG_LOCAL(t_key,"key")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<190>");
			if(t_state->m_buttons.At(t_j)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<191>");
				if(!m__keyDown.At(t_key)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<192>");
					m__keyDown.At(t_key)=true;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<193>");
					p_PutKeyHit(t_key);
				}
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<196>");
				m__keyDown.At(t_key)=false;
			}
		}
	}
}
void c_InputDevice::p_EndUpdate(){
	DBG_ENTER("InputDevice.EndUpdate")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<203>");
	for(int t_i=0;t_i<m__keyHitPut;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<204>");
		m__keyHit.At(m__keyHitQueue.At(t_i))=0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<206>");
	m__keyHitPut=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<207>");
	m__charGet=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<208>");
	m__charPut=0;
}
void c_InputDevice::p_KeyEvent(int t_event,int t_data){
	DBG_ENTER("InputDevice.KeyEvent")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<107>");
	int t_1=t_event;
	DBG_LOCAL(t_1,"1")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<108>");
	if(t_1==1){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<109>");
		if(!m__keyDown.At(t_data)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<110>");
			m__keyDown.At(t_data)=true;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<111>");
			p_PutKeyHit(t_data);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<112>");
			if(t_data==1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<113>");
				m__keyDown.At(384)=true;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<114>");
				p_PutKeyHit(384);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<115>");
				if(t_data==384){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<116>");
					m__keyDown.At(1)=true;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<117>");
					p_PutKeyHit(1);
				}
			}
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<120>");
		if(t_1==2){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<121>");
			if(m__keyDown.At(t_data)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<122>");
				m__keyDown.At(t_data)=false;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<123>");
				if(t_data==1){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<124>");
					m__keyDown.At(384)=false;
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<125>");
					if(t_data==384){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<126>");
						m__keyDown.At(1)=false;
					}
				}
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<129>");
			if(t_1==3){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<130>");
				if(m__charPut<m__charQueue.Length()){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<131>");
					m__charQueue.At(m__charPut)=t_data;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<132>");
					m__charPut+=1;
				}
			}
		}
	}
}
void c_InputDevice::p_MouseEvent(int t_event,int t_data,Float t_x,Float t_y){
	DBG_ENTER("InputDevice.MouseEvent")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<138>");
	int t_2=t_event;
	DBG_LOCAL(t_2,"2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<139>");
	if(t_2==4){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<140>");
		p_KeyEvent(1,1+t_data);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<141>");
		if(t_2==5){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<142>");
			p_KeyEvent(2,1+t_data);
			return;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<144>");
			if(t_2==6){
				DBG_BLOCK();
			}else{
				DBG_BLOCK();
				return;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<148>");
	m__mouseX=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<149>");
	m__mouseY=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<150>");
	m__touchX.At(0)=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<151>");
	m__touchY.At(0)=t_y;
}
void c_InputDevice::p_TouchEvent(int t_event,int t_data,Float t_x,Float t_y){
	DBG_ENTER("InputDevice.TouchEvent")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<155>");
	int t_3=t_event;
	DBG_LOCAL(t_3,"3")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<156>");
	if(t_3==7){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<157>");
		p_KeyEvent(1,384+t_data);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<158>");
		if(t_3==8){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<159>");
			p_KeyEvent(2,384+t_data);
			return;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<161>");
			if(t_3==9){
				DBG_BLOCK();
			}else{
				DBG_BLOCK();
				return;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<165>");
	m__touchX.At(t_data)=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<166>");
	m__touchY.At(t_data)=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<167>");
	if(t_data==0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<168>");
		m__mouseX=t_x;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<169>");
		m__mouseY=t_y;
	}
}
void c_InputDevice::p_MotionEvent(int t_event,int t_data,Float t_x,Float t_y,Float t_z){
	DBG_ENTER("InputDevice.MotionEvent")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_event,"event")
	DBG_LOCAL(t_data,"data")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_z,"z")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<174>");
	int t_4=t_event;
	DBG_LOCAL(t_4,"4")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<175>");
	if(t_4==10){
		DBG_BLOCK();
	}else{
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<179>");
	m__accelX=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<180>");
	m__accelY=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<181>");
	m__accelZ=t_z;
}
Float c_InputDevice::p_MouseX(){
	DBG_ENTER("InputDevice.MouseX")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<65>");
	return m__mouseX;
}
Float c_InputDevice::p_MouseY(){
	DBG_ENTER("InputDevice.MouseY")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<69>");
	return m__mouseY;
}
int c_InputDevice::p_KeyHit(int t_key){
	DBG_ENTER("InputDevice.KeyHit")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<48>");
	if(t_key>0 && t_key<512){
		DBG_BLOCK();
		return m__keyHit.At(t_key);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<49>");
	return 0;
}
bool c_InputDevice::p_KeyDown(int t_key){
	DBG_ENTER("InputDevice.KeyDown")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<43>");
	if(t_key>0 && t_key<512){
		DBG_BLOCK();
		return m__keyDown.At(t_key);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<44>");
	return false;
}
Float c_InputDevice::p_TouchX(int t_index){
	DBG_ENTER("InputDevice.TouchX")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<73>");
	if(t_index>=0 && t_index<32){
		DBG_BLOCK();
		return m__touchX.At(t_index);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<74>");
	return FLOAT(0.0);
}
Float c_InputDevice::p_TouchY(int t_index){
	DBG_ENTER("InputDevice.TouchY")
	c_InputDevice *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<78>");
	if(t_index>=0 && t_index<32){
		DBG_BLOCK();
		return m__touchY.At(t_index);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<79>");
	return FLOAT(0.0);
}
void c_InputDevice::mark(){
	Object::mark();
	gc_mark_q(m__joyStates);
	gc_mark_q(m__keyDown);
	gc_mark_q(m__keyHitQueue);
	gc_mark_q(m__keyHit);
	gc_mark_q(m__charQueue);
	gc_mark_q(m__touchX);
	gc_mark_q(m__touchY);
}
String c_InputDevice::debug(){
	String t="(InputDevice)\n";
	t+=dbg_decl("_keyDown",&m__keyDown);
	t+=dbg_decl("_keyHit",&m__keyHit);
	t+=dbg_decl("_keyHitQueue",&m__keyHitQueue);
	t+=dbg_decl("_keyHitPut",&m__keyHitPut);
	t+=dbg_decl("_charQueue",&m__charQueue);
	t+=dbg_decl("_charPut",&m__charPut);
	t+=dbg_decl("_charGet",&m__charGet);
	t+=dbg_decl("_mouseX",&m__mouseX);
	t+=dbg_decl("_mouseY",&m__mouseY);
	t+=dbg_decl("_touchX",&m__touchX);
	t+=dbg_decl("_touchY",&m__touchY);
	t+=dbg_decl("_accelX",&m__accelX);
	t+=dbg_decl("_accelY",&m__accelY);
	t+=dbg_decl("_accelZ",&m__accelZ);
	t+=dbg_decl("_joyStates",&m__joyStates);
	return t;
}
c_JoyState::c_JoyState(){
	m_joyx=Array<Float >(2);
	m_joyy=Array<Float >(2);
	m_joyz=Array<Float >(2);
	m_buttons=Array<bool >(32);
}
c_JoyState* c_JoyState::m_new(){
	DBG_ENTER("JoyState.new")
	c_JoyState *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/inputdevice.monkey<10>");
	return this;
}
void c_JoyState::mark(){
	Object::mark();
	gc_mark_q(m_joyx);
	gc_mark_q(m_joyy);
	gc_mark_q(m_joyz);
	gc_mark_q(m_buttons);
}
String c_JoyState::debug(){
	String t="(JoyState)\n";
	t+=dbg_decl("joyx",&m_joyx);
	t+=dbg_decl("joyy",&m_joyy);
	t+=dbg_decl("joyz",&m_joyz);
	t+=dbg_decl("buttons",&m_buttons);
	return t;
}
c_InputDevice* bb_input_device;
int bb_input_SetInputDevice(c_InputDevice* t_dev){
	DBG_ENTER("SetInputDevice")
	DBG_LOCAL(t_dev,"dev")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<18>");
	gc_assign(bb_input_device,t_dev);
	return 0;
}
gxtkGraphics* bb_graphics_renderDevice;
int bb_graphics_SetMatrix(Float t_ix,Float t_iy,Float t_jx,Float t_jy,Float t_tx,Float t_ty){
	DBG_ENTER("SetMatrix")
	DBG_LOCAL(t_ix,"ix")
	DBG_LOCAL(t_iy,"iy")
	DBG_LOCAL(t_jx,"jx")
	DBG_LOCAL(t_jy,"jy")
	DBG_LOCAL(t_tx,"tx")
	DBG_LOCAL(t_ty,"ty")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<311>");
	bb_graphics_context->m_ix=t_ix;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<312>");
	bb_graphics_context->m_iy=t_iy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<313>");
	bb_graphics_context->m_jx=t_jx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<314>");
	bb_graphics_context->m_jy=t_jy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<315>");
	bb_graphics_context->m_tx=t_tx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<316>");
	bb_graphics_context->m_ty=t_ty;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<317>");
	bb_graphics_context->m_tformed=((t_ix!=FLOAT(1.0) || t_iy!=FLOAT(0.0) || t_jx!=FLOAT(0.0) || t_jy!=FLOAT(1.0) || t_tx!=FLOAT(0.0) || t_ty!=FLOAT(0.0))?1:0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<318>");
	bb_graphics_context->m_matDirty=1;
	return 0;
}
int bb_graphics_SetMatrix2(Array<Float > t_m){
	DBG_ENTER("SetMatrix")
	DBG_LOCAL(t_m,"m")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<307>");
	bb_graphics_SetMatrix(t_m.At(0),t_m.At(1),t_m.At(2),t_m.At(3),t_m.At(4),t_m.At(5));
	return 0;
}
int bb_graphics_SetColor(Float t_r,Float t_g,Float t_b){
	DBG_ENTER("SetColor")
	DBG_LOCAL(t_r,"r")
	DBG_LOCAL(t_g,"g")
	DBG_LOCAL(t_b,"b")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<253>");
	bb_graphics_context->m_color_r=t_r;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<254>");
	bb_graphics_context->m_color_g=t_g;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<255>");
	bb_graphics_context->m_color_b=t_b;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<256>");
	bb_graphics_renderDevice->SetColor(t_r,t_g,t_b);
	return 0;
}
int bb_graphics_SetAlpha(Float t_alpha){
	DBG_ENTER("SetAlpha")
	DBG_LOCAL(t_alpha,"alpha")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<270>");
	bb_graphics_context->m_alpha=t_alpha;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<271>");
	bb_graphics_renderDevice->SetAlpha(t_alpha);
	return 0;
}
int bb_graphics_SetBlend(int t_blend){
	DBG_ENTER("SetBlend")
	DBG_LOCAL(t_blend,"blend")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<279>");
	bb_graphics_context->m_blend=t_blend;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<280>");
	bb_graphics_renderDevice->SetBlend(t_blend);
	return 0;
}
int bb_graphics_DeviceWidth(){
	DBG_ENTER("DeviceWidth")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<230>");
	int t_=bb_graphics_device->Width();
	return t_;
}
int bb_graphics_DeviceHeight(){
	DBG_ENTER("DeviceHeight")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<234>");
	int t_=bb_graphics_device->Height();
	return t_;
}
int bb_graphics_SetScissor(Float t_x,Float t_y,Float t_width,Float t_height){
	DBG_ENTER("SetScissor")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_width,"width")
	DBG_LOCAL(t_height,"height")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<288>");
	bb_graphics_context->m_scissor_x=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<289>");
	bb_graphics_context->m_scissor_y=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<290>");
	bb_graphics_context->m_scissor_width=t_width;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<291>");
	bb_graphics_context->m_scissor_height=t_height;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<292>");
	bb_graphics_renderDevice->SetScissor(int(t_x),int(t_y),int(t_width),int(t_height));
	return 0;
}
int bb_graphics_BeginRender(){
	DBG_ENTER("BeginRender")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<216>");
	gc_assign(bb_graphics_renderDevice,bb_graphics_device);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<217>");
	bb_graphics_context->m_matrixSp=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<218>");
	bb_graphics_SetMatrix(FLOAT(1.0),FLOAT(0.0),FLOAT(0.0),FLOAT(1.0),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<219>");
	bb_graphics_SetColor(FLOAT(255.0),FLOAT(255.0),FLOAT(255.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<220>");
	bb_graphics_SetAlpha(FLOAT(1.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<221>");
	bb_graphics_SetBlend(0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<222>");
	bb_graphics_SetScissor(FLOAT(0.0),FLOAT(0.0),Float(bb_graphics_DeviceWidth()),Float(bb_graphics_DeviceHeight()));
	return 0;
}
int bb_graphics_EndRender(){
	DBG_ENTER("EndRender")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<226>");
	bb_graphics_renderDevice=0;
	return 0;
}
c_BBGameEvent::c_BBGameEvent(){
}
void c_BBGameEvent::mark(){
	Object::mark();
}
String c_BBGameEvent::debug(){
	String t="(BBGameEvent)\n";
	return t;
}
int bb_app_EndApp(){
	DBG_ENTER("EndApp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<186>");
	bbError(String());
	return 0;
}
Float bb_framework_DEVICE_WIDTH;
Float bb_framework_DEVICE_HEIGHT;
Float bb_framework_SCREEN_WIDTH;
Float bb_framework_SCREEN_HEIGHT;
Float bb_framework_SCREEN_WIDTH2;
Float bb_framework_SCREEN_HEIGHT2;
Float bb_framework_SCREENX_RATIO;
Float bb_framework_SCREENY_RATIO;
Float bb_input_MouseX(){
	DBG_ENTER("MouseX")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<54>");
	Float t_=bb_input_device->p_MouseX();
	return t_;
}
Float bb_input_MouseY(){
	DBG_ENTER("MouseY")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<58>");
	Float t_=bb_input_device->p_MouseY();
	return t_;
}
int bb_random_Seed;
c_DeltaTimer::c_DeltaTimer(){
	m_targetfps=FLOAT(60.0);
	m_lastticks=FLOAT(.0);
	m_delta=FLOAT(.0);
	m_frametime=FLOAT(.0);
	m_currentticks=FLOAT(.0);
}
c_DeltaTimer* c_DeltaTimer::m_new(Float t_fps){
	DBG_ENTER("DeltaTimer.new")
	c_DeltaTimer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_fps,"fps")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<979>");
	m_targetfps=t_fps;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<980>");
	m_lastticks=Float(bb_app_Millisecs());
	return this;
}
c_DeltaTimer* c_DeltaTimer::m_new2(){
	DBG_ENTER("DeltaTimer.new")
	c_DeltaTimer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<971>");
	return this;
}
void c_DeltaTimer::p_UpdateDelta(){
	DBG_ENTER("DeltaTimer.UpdateDelta")
	c_DeltaTimer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<984>");
	m_currentticks=Float(bb_app_Millisecs());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<985>");
	m_frametime=m_currentticks-m_lastticks;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<986>");
	m_delta=m_frametime/(FLOAT(1000.0)/m_targetfps);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<987>");
	m_lastticks=m_currentticks;
}
void c_DeltaTimer::mark(){
	Object::mark();
}
String c_DeltaTimer::debug(){
	String t="(DeltaTimer)\n";
	t+=dbg_decl("targetfps",&m_targetfps);
	t+=dbg_decl("currentticks",&m_currentticks);
	t+=dbg_decl("lastticks",&m_lastticks);
	t+=dbg_decl("frametime",&m_frametime);
	t+=dbg_decl("delta",&m_delta);
	return t;
}
int bb_app_Millisecs(){
	DBG_ENTER("Millisecs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<160>");
	int t_=bb_app__game->Millisecs();
	return t_;
}
c_DeltaTimer* bb_framework_dt;
int bb_app__updateRate;
int bb_app_SetUpdateRate(int t_hertz){
	DBG_ENTER("SetUpdateRate")
	DBG_LOCAL(t_hertz,"hertz")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<151>");
	bb_app__updateRate=t_hertz;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<152>");
	bb_app__game->SetUpdateRate(t_hertz);
	return 0;
}
c_Sprite::c_Sprite(){
	m_image=0;
	m_x=FLOAT(.0);
	m_y=FLOAT(.0);
	m_alpha=FLOAT(1.0);
	m_hitBox=0;
	m_visible=true;
	m_frame=0;
	m_frameStart=0;
	m_frameEnd=0;
	m_reverse=false;
	m_pingPong=false;
	m_loop=true;
	m_frameSpeed=0;
	m_frameTimer=0;
	m_ping=0;
	m_scaleX=FLOAT(1.0);
	m_scaleY=FLOAT(1.0);
	m_red=255;
	m_green=255;
	m_blue=255;
	m_rotation=FLOAT(.0);
}
void c_Sprite::p_SetHitBox(int t_hitX,int t_hitY,int t_hitWidth,int t_hitHeight){
	DBG_ENTER("Sprite.SetHitBox")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_hitX,"hitX")
	DBG_LOCAL(t_hitY,"hitY")
	DBG_LOCAL(t_hitWidth,"hitWidth")
	DBG_LOCAL(t_hitHeight,"hitHeight")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1998>");
	gc_assign(m_hitBox,(new c_HitBox)->m_new(Float(t_hitX),Float(t_hitY),Float(t_hitWidth),Float(t_hitHeight)));
}
c_Sprite* c_Sprite::m_new(c_GameImage* t_img,Float t_x,Float t_y){
	DBG_ENTER("Sprite.new")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_img,"img")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1804>");
	gc_assign(this->m_image,t_img);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1805>");
	this->m_x=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1806>");
	this->m_y=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1807>");
	this->m_alpha=FLOAT(1.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1808>");
	this->p_SetHitBox(int(-t_img->m_image->p_HandleX()),int(-t_img->m_image->p_HandleY()),t_img->m_w,t_img->m_h);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1809>");
	this->m_visible=true;
	return this;
}
c_Sprite* c_Sprite::m_new2(){
	DBG_ENTER("Sprite.new")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1764>");
	return this;
}
void c_Sprite::p_SetFrame(int t_startFrame,int t_endFrame,int t_speed,bool t_pingPong,bool t_loop){
	DBG_ENTER("Sprite.SetFrame")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_startFrame,"startFrame")
	DBG_LOCAL(t_endFrame,"endFrame")
	DBG_LOCAL(t_speed,"speed")
	DBG_LOCAL(t_pingPong,"pingPong")
	DBG_LOCAL(t_loop,"loop")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1878>");
	m_frame=t_startFrame;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1879>");
	m_frameStart=t_startFrame;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1880>");
	m_frameEnd=t_endFrame;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1881>");
	if(t_startFrame>t_endFrame){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1882>");
		m_reverse=true;
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1884>");
		m_reverse=false;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1886>");
	this->m_pingPong=t_pingPong;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1887>");
	this->m_loop=t_loop;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1888>");
	m_frameSpeed=t_speed;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1889>");
	m_frameTimer=bb_app_Millisecs();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1890>");
	m_ping=0;
}
int c_Sprite::p_ResetAnim(){
	DBG_ENTER("Sprite.ResetAnim")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1916>");
	if(m_loop){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1917>");
		if(m_pingPong){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1918>");
			m_reverse=!m_reverse;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1919>");
			m_frame=m_frameEnd;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1920>");
			int t_ts=m_frameStart;
			DBG_LOCAL(t_ts,"ts")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1921>");
			m_frameStart=m_frameEnd;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1922>");
			m_frameEnd=t_ts;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1924>");
			m_frame=m_frameStart;
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1927>");
		if(m_pingPong && m_ping<1){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1928>");
			m_reverse=!m_reverse;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1929>");
			m_frame=m_frameEnd;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1930>");
			int t_ts2=m_frameStart;
			DBG_LOCAL(t_ts2,"ts")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1931>");
			m_frameStart=m_frameEnd;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1932>");
			m_frameEnd=t_ts2;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1933>");
			m_ping+=1;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1935>");
			m_frame=m_frameEnd;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1936>");
			return 1;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1939>");
	return 0;
}
int c_Sprite::p_UpdateAnimation(){
	DBG_ENTER("Sprite.UpdateAnimation")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1895>");
	int t_rv=0;
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1896>");
	if(m_frameSpeed>0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1897>");
		if(bb_app_Millisecs()>m_frameTimer+m_frameSpeed){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1898>");
			if(!m_reverse){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1899>");
				m_frame+=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1900>");
				if(m_frame>m_frameEnd){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1901>");
					t_rv=p_ResetAnim();
				}
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1904>");
				m_frame-=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1905>");
				if(m_frame<m_frameEnd){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1906>");
					t_rv=p_ResetAnim();
				}
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1909>");
			m_frameTimer=bb_app_Millisecs();
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1912>");
	return t_rv;
}
void c_Sprite::p_Draw3(Float t_offsetx,Float t_offsety,bool t_rounded){
	DBG_ENTER("Sprite.Draw")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_offsetx,"offsetx")
	DBG_LOCAL(t_offsety,"offsety")
	DBG_LOCAL(t_rounded,"rounded")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1951>");
	if(!m_visible){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1956>");
	if(m_x-t_offsetx+Float(m_image->m_w)*m_scaleX+Float(m_image->m_h)*m_scaleY<FLOAT(0.0) || m_x-t_offsetx-Float(m_image->m_w)*m_scaleX-Float(m_image->m_h)*m_scaleY>=bb_framework_SCREEN_WIDTH || m_y-t_offsety+Float(m_image->m_h)*m_scaleY+Float(m_image->m_w)*m_scaleX<FLOAT(0.0) || m_y-t_offsety-Float(m_image->m_h)*m_scaleY-Float(m_image->m_w)*m_scaleX>=bb_framework_SCREEN_HEIGHT){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1958>");
	if(this->m_alpha>FLOAT(1.0)){
		DBG_BLOCK();
		this->m_alpha=FLOAT(1.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1959>");
	if(this->m_alpha<FLOAT(0.0)){
		DBG_BLOCK();
		this->m_alpha=FLOAT(0.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1961>");
	bb_graphics_SetAlpha(this->m_alpha);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1962>");
	bb_graphics_SetColor(Float(m_red),Float(m_green),Float(m_blue));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1963>");
	if(t_rounded){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1964>");
		bb_graphics_DrawImage2(m_image->m_image,(Float)floor(m_x-t_offsetx+FLOAT(0.5)),(Float)floor(m_y-t_offsety+FLOAT(0.5)),m_rotation,m_scaleX,m_scaleY,m_frame);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1966>");
		bb_graphics_DrawImage2(m_image->m_image,m_x-t_offsetx,m_y-t_offsety,m_rotation,m_scaleX,m_scaleY,m_frame);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1969>");
	bb_graphics_SetColor(FLOAT(255.0),FLOAT(255.0),FLOAT(255.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1970>");
	bb_graphics_SetAlpha(FLOAT(1.0));
}
void c_Sprite::p_Draw4(bool t_rounded){
	DBG_ENTER("Sprite.Draw")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_rounded,"rounded")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1947>");
	p_Draw3(FLOAT(0.0),FLOAT(0.0),t_rounded);
}
void c_Sprite::p_Draw(){
	DBG_ENTER("Sprite.Draw")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1943>");
	p_Draw3(FLOAT(0.0),FLOAT(0.0),false);
}
void c_Sprite::p_DrawHitBox(Float t_offsetx,Float t_offsety){
	DBG_ENTER("Sprite.DrawHitBox")
	c_Sprite *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_offsetx,"offsetx")
	DBG_LOCAL(t_offsety,"offsety")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1974>");
	if(!m_visible){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1976>");
	bb_graphics_DrawRect(m_x-FLOAT(1.0)-t_offsetx,m_y-FLOAT(1.0)-t_offsety,FLOAT(2.0),FLOAT(2.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<1978>");
	bb_functions_DrawRectOutline(int(m_x+m_hitBox->m_x-t_offsetx),int(m_y+m_hitBox->m_y-t_offsety),int(m_hitBox->m_w),int(m_hitBox->m_h));
}
void c_Sprite::mark(){
	Object::mark();
	gc_mark_q(m_image);
	gc_mark_q(m_hitBox);
}
String c_Sprite::debug(){
	String t="(Sprite)\n";
	t+=dbg_decl("visible",&m_visible);
	t+=dbg_decl("x",&m_x);
	t+=dbg_decl("y",&m_y);
	t+=dbg_decl("image",&m_image);
	t+=dbg_decl("scaleX",&m_scaleX);
	t+=dbg_decl("scaleY",&m_scaleY);
	t+=dbg_decl("red",&m_red);
	t+=dbg_decl("green",&m_green);
	t+=dbg_decl("blue",&m_blue);
	t+=dbg_decl("alpha",&m_alpha);
	t+=dbg_decl("hitBox",&m_hitBox);
	t+=dbg_decl("frame",&m_frame);
	t+=dbg_decl("frameTimer",&m_frameTimer);
	t+=dbg_decl("frameStart",&m_frameStart);
	t+=dbg_decl("frameEnd",&m_frameEnd);
	t+=dbg_decl("frameSpeed",&m_frameSpeed);
	t+=dbg_decl("reverse",&m_reverse);
	t+=dbg_decl("pingPong",&m_pingPong);
	t+=dbg_decl("loop",&m_loop);
	t+=dbg_decl("ping",&m_ping);
	t+=dbg_decl("rotation",&m_rotation);
	return t;
}
c_Particle::c_Particle(){
}
int c_Particle::m_MAX_PARTICLES;
c_Particle* c_Particle::m_new(){
	DBG_ENTER("Particle.new")
	c_Particle *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2016>");
	c_Sprite::m_new2();
	return this;
}
Array<c_Particle* > c_Particle::m_particles;
void c_Particle::m_Cache(){
	DBG_ENTER("Particle.Cache")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2031>");
	for(int t_i=0;t_i<=m_MAX_PARTICLES-1;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2032>");
		gc_assign(m_particles.At(t_i),(new c_Particle)->m_new());
	}
}
void c_Particle::mark(){
	c_Sprite::mark();
}
String c_Particle::debug(){
	String t="(Particle)\n";
	t=c_Sprite::debug()+t;
	t+=dbg_decl("MAX_PARTICLES",&c_Particle::m_MAX_PARTICLES);
	t+=dbg_decl("particles",&c_Particle::m_particles);
	return t;
}
c_HitBox::c_HitBox(){
	m_x=FLOAT(.0);
	m_y=FLOAT(.0);
	m_w=FLOAT(.0);
	m_h=FLOAT(.0);
}
c_HitBox* c_HitBox::m_new(Float t_x,Float t_y,Float t_w,Float t_h){
	DBG_ENTER("HitBox.new")
	c_HitBox *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_w,"w")
	DBG_LOCAL(t_h,"h")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2008>");
	this->m_x=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2009>");
	this->m_y=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2010>");
	this->m_w=t_w;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2011>");
	this->m_h=t_h;
	return this;
}
c_HitBox* c_HitBox::m_new2(){
	DBG_ENTER("HitBox.new")
	c_HitBox *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<2003>");
	return this;
}
void c_HitBox::mark(){
	Object::mark();
}
String c_HitBox::debug(){
	String t="(HitBox)\n";
	t+=dbg_decl("x",&m_x);
	t+=dbg_decl("y",&m_y);
	t+=dbg_decl("w",&m_w);
	t+=dbg_decl("h",&m_h);
	return t;
}
c_FPSCounter::c_FPSCounter(){
}
int c_FPSCounter::m_startTime;
int c_FPSCounter::m_fpsCount;
int c_FPSCounter::m_totalFPS;
void c_FPSCounter::m_Update(){
	DBG_ENTER("FPSCounter.Update")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<956>");
	if(bb_app_Millisecs()-m_startTime>=1000){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<957>");
		m_totalFPS=m_fpsCount;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<958>");
		m_fpsCount=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<959>");
		m_startTime=bb_app_Millisecs();
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<961>");
		m_fpsCount+=1;
	}
}
void c_FPSCounter::m_Draw(int t_x,int t_y,Float t_ax,Float t_ay){
	DBG_ENTER("FPSCounter.Draw")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_ax,"ax")
	DBG_LOCAL(t_ay,"ay")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/framework.monkey<966>");
	bb_graphics_DrawText(String(L"FPS: ",5)+String(m_totalFPS),Float(t_x),Float(t_y),t_ax,t_ay);
}
void c_FPSCounter::mark(){
	Object::mark();
}
String c_FPSCounter::debug(){
	String t="(FPSCounter)\n";
	t+=dbg_decl("fpsCount",&c_FPSCounter::m_fpsCount);
	t+=dbg_decl("startTime",&c_FPSCounter::m_startTime);
	t+=dbg_decl("totalFPS",&c_FPSCounter::m_totalFPS);
	return t;
}
int bb_graphics_PushMatrix(){
	DBG_ENTER("PushMatrix")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<332>");
	int t_sp=bb_graphics_context->m_matrixSp;
	DBG_LOCAL(t_sp,"sp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<333>");
	bb_graphics_context->m_matrixStack.At(t_sp+0)=bb_graphics_context->m_ix;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<334>");
	bb_graphics_context->m_matrixStack.At(t_sp+1)=bb_graphics_context->m_iy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<335>");
	bb_graphics_context->m_matrixStack.At(t_sp+2)=bb_graphics_context->m_jx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<336>");
	bb_graphics_context->m_matrixStack.At(t_sp+3)=bb_graphics_context->m_jy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<337>");
	bb_graphics_context->m_matrixStack.At(t_sp+4)=bb_graphics_context->m_tx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<338>");
	bb_graphics_context->m_matrixStack.At(t_sp+5)=bb_graphics_context->m_ty;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<339>");
	bb_graphics_context->m_matrixSp=t_sp+6;
	return 0;
}
int bb_math_Max(int t_x,int t_y){
	DBG_ENTER("Max")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<56>");
	if(t_x>t_y){
		DBG_BLOCK();
		return t_x;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<57>");
	return t_y;
}
Float bb_math_Max2(Float t_x,Float t_y){
	DBG_ENTER("Max")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<83>");
	if(t_x>t_y){
		DBG_BLOCK();
		return t_x;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<84>");
	return t_y;
}
int bb_math_Min(int t_x,int t_y){
	DBG_ENTER("Min")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<51>");
	if(t_x<t_y){
		DBG_BLOCK();
		return t_x;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<52>");
	return t_y;
}
Float bb_math_Min2(Float t_x,Float t_y){
	DBG_ENTER("Min")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<78>");
	if(t_x<t_y){
		DBG_BLOCK();
		return t_x;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/math.monkey<79>");
	return t_y;
}
int bb_graphics_DebugRenderDevice(){
	DBG_ENTER("DebugRenderDevice")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<49>");
	if(!((bb_graphics_renderDevice)!=0)){
		DBG_BLOCK();
		bbError(String(L"Rendering operations can only be performed inside OnRender",58));
	}
	return 0;
}
int bb_graphics_Cls(Float t_r,Float t_g,Float t_b){
	DBG_ENTER("Cls")
	DBG_LOCAL(t_r,"r")
	DBG_LOCAL(t_g,"g")
	DBG_LOCAL(t_b,"b")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<376>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<378>");
	bb_graphics_renderDevice->Cls(t_r,t_g,t_b);
	return 0;
}
int bb_graphics_Transform(Float t_ix,Float t_iy,Float t_jx,Float t_jy,Float t_tx,Float t_ty){
	DBG_ENTER("Transform")
	DBG_LOCAL(t_ix,"ix")
	DBG_LOCAL(t_iy,"iy")
	DBG_LOCAL(t_jx,"jx")
	DBG_LOCAL(t_jy,"jy")
	DBG_LOCAL(t_tx,"tx")
	DBG_LOCAL(t_ty,"ty")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<353>");
	Float t_ix2=t_ix*bb_graphics_context->m_ix+t_iy*bb_graphics_context->m_jx;
	DBG_LOCAL(t_ix2,"ix2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<354>");
	Float t_iy2=t_ix*bb_graphics_context->m_iy+t_iy*bb_graphics_context->m_jy;
	DBG_LOCAL(t_iy2,"iy2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<355>");
	Float t_jx2=t_jx*bb_graphics_context->m_ix+t_jy*bb_graphics_context->m_jx;
	DBG_LOCAL(t_jx2,"jx2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<356>");
	Float t_jy2=t_jx*bb_graphics_context->m_iy+t_jy*bb_graphics_context->m_jy;
	DBG_LOCAL(t_jy2,"jy2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<357>");
	Float t_tx2=t_tx*bb_graphics_context->m_ix+t_ty*bb_graphics_context->m_jx+bb_graphics_context->m_tx;
	DBG_LOCAL(t_tx2,"tx2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<358>");
	Float t_ty2=t_tx*bb_graphics_context->m_iy+t_ty*bb_graphics_context->m_jy+bb_graphics_context->m_ty;
	DBG_LOCAL(t_ty2,"ty2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<359>");
	bb_graphics_SetMatrix(t_ix2,t_iy2,t_jx2,t_jy2,t_tx2,t_ty2);
	return 0;
}
int bb_graphics_Transform2(Array<Float > t_m){
	DBG_ENTER("Transform")
	DBG_LOCAL(t_m,"m")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<349>");
	bb_graphics_Transform(t_m.At(0),t_m.At(1),t_m.At(2),t_m.At(3),t_m.At(4),t_m.At(5));
	return 0;
}
int bb_graphics_Scale(Float t_x,Float t_y){
	DBG_ENTER("Scale")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<367>");
	bb_graphics_Transform(t_x,FLOAT(0.0),FLOAT(0.0),t_y,FLOAT(0.0),FLOAT(0.0));
	return 0;
}
int bb_graphics_Translate(Float t_x,Float t_y){
	DBG_ENTER("Translate")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<363>");
	bb_graphics_Transform(FLOAT(1.0),FLOAT(0.0),FLOAT(0.0),FLOAT(1.0),t_x,t_y);
	return 0;
}
c_DiddyDataLayer::c_DiddyDataLayer(){
	m_index=0;
	m_objects=(new c_DiddyDataObjects)->m_new();
}
void c_DiddyDataLayer::p_Render2(Float t_xoffset,Float t_yoffset){
	DBG_ENTER("DiddyDataLayer.Render")
	c_DiddyDataLayer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_xoffset,"xoffset")
	DBG_LOCAL(t_yoffset,"yoffset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<236>");
	c_IEnumerator2* t_=m_objects->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_DiddyDataObject* t_obj=t_->p_NextObject();
		DBG_LOCAL(t_obj,"obj")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<237>");
		if(t_obj->m_visible){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<238>");
			t_obj->p_Render2(t_xoffset,t_yoffset);
		}
	}
}
void c_DiddyDataLayer::mark(){
	Object::mark();
	gc_mark_q(m_objects);
}
String c_DiddyDataLayer::debug(){
	String t="(DiddyDataLayer)\n";
	t+=dbg_decl("index",&m_index);
	t+=dbg_decl("objects",&m_objects);
	return t;
}
c_ICollection::c_ICollection(){
}
c_IEnumerator* c_ICollection::p_ObjectEnumerator(){
	DBG_ENTER("ICollection.ObjectEnumerator")
	c_ICollection *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>");
	c_IEnumerator* t_=p_Enumerator();
	return t_;
}
void c_ICollection::mark(){
	Object::mark();
}
String c_ICollection::debug(){
	String t="(ICollection)\n";
	return t;
}
c_IList::c_IList(){
	m_modCount=0;
}
c_IEnumerator* c_IList::p_Enumerator(){
	DBG_ENTER("IList.Enumerator")
	c_IList *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>");
	c_IEnumerator* t_=((new c_ListEnumerator)->m_new(this));
	return t_;
}
void c_IList::p_RangeCheck(int t_index){
	DBG_ENTER("IList.RangeCheck")
	c_IList *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>");
	int t_size=this->p_Size();
	DBG_LOCAL(t_size,"size")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>");
	if(t_index<0 || t_index>=t_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"IList.RangeCheck: Index out of bounds: ",39)+String(t_index)+String(L" is not 0<=index<",17)+String(t_size),0);
	}
}
void c_IList::mark(){
	c_ICollection::mark();
}
String c_IList::debug(){
	String t="(IList)\n";
	t=c_ICollection::debug()+t;
	t+=dbg_decl("modCount",&m_modCount);
	return t;
}
c_ArrayList::c_ArrayList(){
	m_size=0;
	m_elements=Array<Object* >();
}
c_IEnumerator* c_ArrayList::p_Enumerator(){
	DBG_ENTER("ArrayList.Enumerator")
	c_ArrayList *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>");
	c_IEnumerator* t_=((new c_ArrayListEnumerator)->m_new(this));
	return t_;
}
int c_ArrayList::p_Size(){
	DBG_ENTER("ArrayList.Size")
	c_ArrayList *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>");
	return m_size;
}
void c_ArrayList::p_RangeCheck(int t_index){
	DBG_ENTER("ArrayList.RangeCheck")
	c_ArrayList *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>");
	if(t_index<0 || t_index>=m_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"ArrayList.RangeCheck: Index out of bounds: ",43)+String(t_index)+String(L" is not 0<=index<",17)+String(m_size),0);
	}
}
c_DiddyDataLayer* c_ArrayList::p_Get2(int t_index){
	DBG_ENTER("ArrayList.Get")
	c_ArrayList *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>");
	p_RangeCheck(t_index);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>");
	c_DiddyDataLayer* t_=dynamic_cast<c_DiddyDataLayer*>(m_elements.At(t_index));
	return t_;
}
void c_ArrayList::mark(){
	c_IList::mark();
	gc_mark_q(m_elements);
}
String c_ArrayList::debug(){
	String t="(ArrayList)\n";
	t=c_IList::debug()+t;
	t+=dbg_decl("elements",&m_elements);
	t+=dbg_decl("size",&m_size);
	return t;
}
c_DiddyDataLayers::c_DiddyDataLayers(){
}
void c_DiddyDataLayers::mark(){
	c_ArrayList::mark();
}
String c_DiddyDataLayers::debug(){
	String t="(DiddyDataLayers)\n";
	t=c_ArrayList::debug()+t;
	return t;
}
c_IEnumerator::c_IEnumerator(){
}
c_IEnumerator* c_IEnumerator::m_new(){
	DBG_ENTER("IEnumerator.new")
	c_IEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>");
	return this;
}
void c_IEnumerator::mark(){
	Object::mark();
}
String c_IEnumerator::debug(){
	String t="(IEnumerator)\n";
	return t;
}
c_DiddyDataObject::c_DiddyDataObject(){
	m_visible=true;
	m_imageName=String();
	m_alpha=FLOAT(1.0);
	m_image=0;
	m_red=255;
	m_green=255;
	m_blue=255;
	m_x=FLOAT(.0);
	m_y=FLOAT(.0);
	m_rotation=FLOAT(.0);
	m_scaleX=FLOAT(.0);
	m_scaleY=FLOAT(.0);
}
void c_DiddyDataObject::p_Render2(Float t_xoffset,Float t_yoffset){
	DBG_ENTER("DiddyDataObject.Render")
	c_DiddyDataObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_xoffset,"xoffset")
	DBG_LOCAL(t_yoffset,"yoffset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<309>");
	if(((m_imageName).Length()!=0) && m_visible && m_alpha>FLOAT(0.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<310>");
		if(!((m_image)!=0)){
			DBG_BLOCK();
			gc_assign(m_image,bb_framework_diddyGame->m_images->p_Find(m_imageName));
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<311>");
		if((m_image)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<312>");
			bb_graphics_SetColor(Float(m_red),Float(m_green),Float(m_blue));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<313>");
			bb_graphics_SetAlpha(m_alpha);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<314>");
			m_image->p_Draw2(m_x+t_xoffset,m_y+t_yoffset,m_rotation,m_scaleX,m_scaleY,0);
		}
	}
}
void c_DiddyDataObject::mark(){
	Object::mark();
	gc_mark_q(m_image);
}
String c_DiddyDataObject::debug(){
	String t="(DiddyDataObject)\n";
	t+=dbg_decl("image",&m_image);
	t+=dbg_decl("imageName",&m_imageName);
	t+=dbg_decl("x",&m_x);
	t+=dbg_decl("y",&m_y);
	t+=dbg_decl("scaleX",&m_scaleX);
	t+=dbg_decl("scaleY",&m_scaleY);
	t+=dbg_decl("rotation",&m_rotation);
	t+=dbg_decl("visible",&m_visible);
	t+=dbg_decl("alpha",&m_alpha);
	t+=dbg_decl("red",&m_red);
	t+=dbg_decl("green",&m_green);
	t+=dbg_decl("blue",&m_blue);
	return t;
}
c_ICollection2::c_ICollection2(){
}
c_ICollection2* c_ICollection2::m_new(){
	DBG_ENTER("ICollection.new")
	c_ICollection2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>");
	return this;
}
c_IEnumerator2* c_ICollection2::p_ObjectEnumerator(){
	DBG_ENTER("ICollection.ObjectEnumerator")
	c_ICollection2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>");
	c_IEnumerator2* t_=p_Enumerator();
	return t_;
}
void c_ICollection2::mark(){
	Object::mark();
}
String c_ICollection2::debug(){
	String t="(ICollection)\n";
	return t;
}
c_IList2::c_IList2(){
	m_modCount=0;
}
c_IList2* c_IList2::m_new(){
	DBG_ENTER("IList.new")
	c_IList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>");
	c_ICollection2::m_new();
	return this;
}
c_IEnumerator2* c_IList2::p_Enumerator(){
	DBG_ENTER("IList.Enumerator")
	c_IList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>");
	c_IEnumerator2* t_=((new c_ListEnumerator2)->m_new(this));
	return t_;
}
void c_IList2::p_RangeCheck(int t_index){
	DBG_ENTER("IList.RangeCheck")
	c_IList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>");
	int t_size=this->p_Size();
	DBG_LOCAL(t_size,"size")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>");
	if(t_index<0 || t_index>=t_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"IList.RangeCheck: Index out of bounds: ",39)+String(t_index)+String(L" is not 0<=index<",17)+String(t_size),0);
	}
}
void c_IList2::mark(){
	c_ICollection2::mark();
}
String c_IList2::debug(){
	String t="(IList)\n";
	t=c_ICollection2::debug()+t;
	t+=dbg_decl("modCount",&m_modCount);
	return t;
}
c_ArrayList2::c_ArrayList2(){
	m_elements=Array<Object* >();
	m_size=0;
}
c_ArrayList2* c_ArrayList2::m_new(){
	DBG_ENTER("ArrayList.new")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>");
	c_IList2::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>");
	gc_assign(this->m_elements,Array<Object* >(10));
	return this;
}
c_ArrayList2* c_ArrayList2::m_new2(int t_initialCapacity){
	DBG_ENTER("ArrayList.new")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_initialCapacity,"initialCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>");
	c_IList2::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>");
	if(t_initialCapacity<0){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Capacity must be >= 0",36),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>");
	gc_assign(this->m_elements,Array<Object* >(t_initialCapacity));
	return this;
}
c_ArrayList2* c_ArrayList2::m_new3(c_ICollection2* t_c){
	DBG_ENTER("ArrayList.new")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_c,"c")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>");
	c_IList2::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>");
	if(!((t_c)!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Source collection must not be null",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>");
	gc_assign(m_elements,t_c->p_ToArray());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>");
	m_size=m_elements.Length();
	return this;
}
c_IEnumerator2* c_ArrayList2::p_Enumerator(){
	DBG_ENTER("ArrayList.Enumerator")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>");
	c_IEnumerator2* t_=((new c_ArrayListEnumerator2)->m_new(this));
	return t_;
}
Array<Object* > c_ArrayList2::p_ToArray(){
	DBG_ENTER("ArrayList.ToArray")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>");
	Array<Object* > t_arr=Array<Object* >(m_size);
	DBG_LOCAL(t_arr,"arr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>");
	for(int t_i=0;t_i<m_size;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>");
		gc_assign(t_arr.At(t_i),m_elements.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>");
	return t_arr;
}
int c_ArrayList2::p_Size(){
	DBG_ENTER("ArrayList.Size")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>");
	return m_size;
}
void c_ArrayList2::p_RangeCheck(int t_index){
	DBG_ENTER("ArrayList.RangeCheck")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>");
	if(t_index<0 || t_index>=m_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"ArrayList.RangeCheck: Index out of bounds: ",43)+String(t_index)+String(L" is not 0<=index<",17)+String(m_size),0);
	}
}
c_DiddyDataObject* c_ArrayList2::p_Get2(int t_index){
	DBG_ENTER("ArrayList.Get")
	c_ArrayList2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>");
	p_RangeCheck(t_index);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>");
	c_DiddyDataObject* t_=dynamic_cast<c_DiddyDataObject*>(m_elements.At(t_index));
	return t_;
}
void c_ArrayList2::mark(){
	c_IList2::mark();
	gc_mark_q(m_elements);
}
String c_ArrayList2::debug(){
	String t="(ArrayList)\n";
	t=c_IList2::debug()+t;
	t+=dbg_decl("elements",&m_elements);
	t+=dbg_decl("size",&m_size);
	return t;
}
c_DiddyDataObjects::c_DiddyDataObjects(){
}
c_DiddyDataObjects* c_DiddyDataObjects::m_new(){
	DBG_ENTER("DiddyDataObjects.new")
	c_DiddyDataObjects *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/diddydata.monkey<244>");
	c_ArrayList2::m_new();
	return this;
}
void c_DiddyDataObjects::mark(){
	c_ArrayList2::mark();
}
String c_DiddyDataObjects::debug(){
	String t="(DiddyDataObjects)\n";
	t=c_ArrayList2::debug()+t;
	return t;
}
c_IEnumerator2::c_IEnumerator2(){
}
c_IEnumerator2* c_IEnumerator2::m_new(){
	DBG_ENTER("IEnumerator.new")
	c_IEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>");
	return this;
}
void c_IEnumerator2::mark(){
	Object::mark();
}
String c_IEnumerator2::debug(){
	String t="(IEnumerator)\n";
	return t;
}
c_MapKeys::c_MapKeys(){
	m_map=0;
}
c_MapKeys* c_MapKeys::m_new(c_Map3* t_map){
	DBG_ENTER("MapKeys.new")
	c_MapKeys *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_map,"map")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>");
	gc_assign(this->m_map,t_map);
	return this;
}
c_MapKeys* c_MapKeys::m_new2(){
	DBG_ENTER("MapKeys.new")
	c_MapKeys *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>");
	return this;
}
c_KeyEnumerator* c_MapKeys::p_ObjectEnumerator(){
	DBG_ENTER("MapKeys.ObjectEnumerator")
	c_MapKeys *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>");
	c_KeyEnumerator* t_=(new c_KeyEnumerator)->m_new(m_map->p_FirstNode());
	return t_;
}
void c_MapKeys::mark(){
	Object::mark();
	gc_mark_q(m_map);
}
String c_MapKeys::debug(){
	String t="(MapKeys)\n";
	t+=dbg_decl("map",&m_map);
	return t;
}
c_KeyEnumerator::c_KeyEnumerator(){
	m_node=0;
}
c_KeyEnumerator* c_KeyEnumerator::m_new(c_Node2* t_node){
	DBG_ENTER("KeyEnumerator.new")
	c_KeyEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>");
	gc_assign(this->m_node,t_node);
	return this;
}
c_KeyEnumerator* c_KeyEnumerator::m_new2(){
	DBG_ENTER("KeyEnumerator.new")
	c_KeyEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>");
	return this;
}
bool c_KeyEnumerator::p_HasNext(){
	DBG_ENTER("KeyEnumerator.HasNext")
	c_KeyEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>");
	bool t_=m_node!=0;
	return t_;
}
String c_KeyEnumerator::p_NextObject(){
	DBG_ENTER("KeyEnumerator.NextObject")
	c_KeyEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>");
	c_Node2* t_t=m_node;
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>");
	gc_assign(m_node,m_node->p_NextNode());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>");
	return t_t->m_key;
}
void c_KeyEnumerator::mark(){
	Object::mark();
	gc_mark_q(m_node);
}
String c_KeyEnumerator::debug(){
	String t="(KeyEnumerator)\n";
	t+=dbg_decl("node",&m_node);
	return t;
}
c_Node2::c_Node2(){
	m_left=0;
	m_right=0;
	m_parent=0;
	m_key=String();
	m_value=0;
	m_color=0;
}
c_Node2* c_Node2::p_NextNode(){
	DBG_ENTER("Node.NextNode")
	c_Node2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>");
	c_Node2* t_node=0;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>");
	if((m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>");
		t_node=m_right;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>");
		while((t_node->m_left)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>");
			t_node=t_node->m_left;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>");
		return t_node;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>");
	t_node=this;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>");
	c_Node2* t_parent=this->m_parent;
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>");
	while(((t_parent)!=0) && t_node==t_parent->m_right){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>");
		t_node=t_parent;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>");
		t_parent=t_parent->m_parent;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>");
	return t_parent;
}
c_Node2* c_Node2::m_new(String t_key,c_GameImage* t_value,int t_color,c_Node2* t_parent){
	DBG_ENTER("Node.new")
	c_Node2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_LOCAL(t_color,"color")
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>");
	this->m_key=t_key;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>");
	gc_assign(this->m_value,t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>");
	this->m_color=t_color;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>");
	gc_assign(this->m_parent,t_parent);
	return this;
}
c_Node2* c_Node2::m_new2(){
	DBG_ENTER("Node.new")
	c_Node2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>");
	return this;
}
void c_Node2::mark(){
	Object::mark();
	gc_mark_q(m_left);
	gc_mark_q(m_right);
	gc_mark_q(m_parent);
	gc_mark_q(m_value);
}
String c_Node2::debug(){
	String t="(Node)\n";
	t+=dbg_decl("key",&m_key);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("color",&m_color);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("left",&m_left);
	t+=dbg_decl("right",&m_right);
	return t;
}
void bb_assert_AssertError(String t_msg){
	DBG_ENTER("AssertError")
	DBG_LOCAL(t_msg,"msg")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<138>");
	throw (new c_AssertException)->m_new(t_msg,0);
}
void bb_assert_AssertNotNull(Object* t_val,String t_msg){
	DBG_ENTER("AssertNotNull")
	DBG_LOCAL(t_val,"val")
	DBG_LOCAL(t_msg,"msg")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<31>");
	if(t_val==0){
		DBG_BLOCK();
		bb_assert_AssertError(t_msg);
	}
}
int bb_graphics_DrawImage(c_Image* t_image,Float t_x,Float t_y,int t_frame){
	DBG_ENTER("DrawImage")
	DBG_LOCAL(t_image,"image")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_frame,"frame")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<449>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<450>");
	if(t_frame<0 || t_frame>=t_image->m_frames.Length()){
		DBG_BLOCK();
		bbError(String(L"Invalid image frame",19));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<453>");
	c_Frame* t_f=t_image->m_frames.At(t_frame);
	DBG_LOCAL(t_f,"f")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<455>");
	bb_graphics_context->p_Validate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<457>");
	if((t_image->m_flags&65536)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<458>");
		bb_graphics_renderDevice->DrawSurface(t_image->m_surface,t_x-t_image->m_tx,t_y-t_image->m_ty);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<460>");
		bb_graphics_renderDevice->DrawSurface2(t_image->m_surface,t_x-t_image->m_tx,t_y-t_image->m_ty,t_f->m_x,t_f->m_y,t_image->m_width,t_image->m_height);
	}
	return 0;
}
int bb_graphics_Rotate(Float t_angle){
	DBG_ENTER("Rotate")
	DBG_LOCAL(t_angle,"angle")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<371>");
	bb_graphics_Transform((Float)cos((t_angle)*D2R),-(Float)sin((t_angle)*D2R),(Float)sin((t_angle)*D2R),(Float)cos((t_angle)*D2R),FLOAT(0.0),FLOAT(0.0));
	return 0;
}
int bb_graphics_PopMatrix(){
	DBG_ENTER("PopMatrix")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<343>");
	int t_sp=bb_graphics_context->m_matrixSp-6;
	DBG_LOCAL(t_sp,"sp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<344>");
	bb_graphics_SetMatrix(bb_graphics_context->m_matrixStack.At(t_sp+0),bb_graphics_context->m_matrixStack.At(t_sp+1),bb_graphics_context->m_matrixStack.At(t_sp+2),bb_graphics_context->m_matrixStack.At(t_sp+3),bb_graphics_context->m_matrixStack.At(t_sp+4),bb_graphics_context->m_matrixStack.At(t_sp+5));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<345>");
	bb_graphics_context->m_matrixSp=t_sp;
	return 0;
}
int bb_graphics_DrawImage2(c_Image* t_image,Float t_x,Float t_y,Float t_rotation,Float t_scaleX,Float t_scaleY,int t_frame){
	DBG_ENTER("DrawImage")
	DBG_LOCAL(t_image,"image")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_rotation,"rotation")
	DBG_LOCAL(t_scaleX,"scaleX")
	DBG_LOCAL(t_scaleY,"scaleY")
	DBG_LOCAL(t_frame,"frame")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<467>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<468>");
	if(t_frame<0 || t_frame>=t_image->m_frames.Length()){
		DBG_BLOCK();
		bbError(String(L"Invalid image frame",19));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<471>");
	c_Frame* t_f=t_image->m_frames.At(t_frame);
	DBG_LOCAL(t_f,"f")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<473>");
	bb_graphics_PushMatrix();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<475>");
	bb_graphics_Translate(t_x,t_y);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<476>");
	bb_graphics_Rotate(t_rotation);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<477>");
	bb_graphics_Scale(t_scaleX,t_scaleY);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<479>");
	bb_graphics_Translate(-t_image->m_tx,-t_image->m_ty);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<481>");
	bb_graphics_context->p_Validate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<483>");
	if((t_image->m_flags&65536)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<484>");
		bb_graphics_renderDevice->DrawSurface(t_image->m_surface,FLOAT(0.0),FLOAT(0.0));
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<486>");
		bb_graphics_renderDevice->DrawSurface2(t_image->m_surface,FLOAT(0.0),FLOAT(0.0),t_f->m_x,t_f->m_y,t_image->m_width,t_image->m_height);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<489>");
	bb_graphics_PopMatrix();
	return 0;
}
int bb_graphics_DrawRect(Float t_x,Float t_y,Float t_w,Float t_h){
	DBG_ENTER("DrawRect")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_w,"w")
	DBG_LOCAL(t_h,"h")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<391>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<393>");
	bb_graphics_context->p_Validate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<394>");
	bb_graphics_renderDevice->DrawRect(t_x,t_y,t_w,t_h);
	return 0;
}
int bb_graphics_DrawText(String t_text,Float t_x,Float t_y,Float t_xalign,Float t_yalign){
	DBG_ENTER("DrawText")
	DBG_LOCAL(t_text,"text")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_xalign,"xalign")
	DBG_LOCAL(t_yalign,"yalign")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<574>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<576>");
	if(!((bb_graphics_context->m_font)!=0)){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<578>");
	int t_w=bb_graphics_context->m_font->p_Width();
	DBG_LOCAL(t_w,"w")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<579>");
	int t_h=bb_graphics_context->m_font->p_Height();
	DBG_LOCAL(t_h,"h")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<581>");
	t_x-=(Float)floor(Float(t_w*t_text.Length())*t_xalign);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<582>");
	t_y-=(Float)floor(Float(t_h)*t_yalign);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<584>");
	for(int t_i=0;t_i<t_text.Length();t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<585>");
		int t_ch=(int)t_text.At(t_i)-bb_graphics_context->m_firstChar;
		DBG_LOCAL(t_ch,"ch")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<586>");
		if(t_ch>=0 && t_ch<bb_graphics_context->m_font->p_Frames()){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<587>");
			bb_graphics_DrawImage(bb_graphics_context->m_font,t_x+Float(t_i*t_w),t_y,t_ch);
		}
	}
	return 0;
}
void bb_assert_Assert(bool t_val,String t_msg){
	DBG_ENTER("Assert")
	DBG_LOCAL(t_val,"val")
	DBG_LOCAL(t_msg,"msg")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<21>");
	if(!t_val){
		DBG_BLOCK();
		bb_assert_AssertError(t_msg);
	}
}
String bb_functions_RSet(String t_str,int t_n,String t_char){
	DBG_ENTER("RSet")
	DBG_LOCAL(t_str,"str")
	DBG_LOCAL(t_n,"n")
	DBG_LOCAL(t_char,"char")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<170>");
	String t_rep=String();
	DBG_LOCAL(t_rep,"rep")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<171>");
	for(int t_i=1;t_i<=t_n;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<172>");
		t_rep=t_rep+t_char;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<174>");
	t_str=t_rep+t_str;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<175>");
	String t_=t_str.Slice(t_str.Length()-t_n);
	return t_;
}
String bb_functions_FormatNumber(Float t_number,int t_decimal,int t_comma,int t_padleft){
	DBG_ENTER("FormatNumber")
	DBG_LOCAL(t_number,"number")
	DBG_LOCAL(t_decimal,"decimal")
	DBG_LOCAL(t_comma,"comma")
	DBG_LOCAL(t_padleft,"padleft")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<235>");
	bb_assert_Assert(t_decimal>-1 && t_comma>-1 && t_padleft>-1,String(L"Negative numbers not allowed in FormatNumber()",46));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<237>");
	String t_str=String(t_number);
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<238>");
	int t_dl=t_str.Find(String(L".",1),0);
	DBG_LOCAL(t_dl,"dl")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<239>");
	if(t_decimal==0){
		DBG_BLOCK();
		t_decimal=-1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<240>");
	t_str=t_str.Slice(0,t_dl+t_decimal+1);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<242>");
	if((t_comma)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<243>");
		while(t_dl>t_comma){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<244>");
			t_str=t_str.Slice(0,t_dl-t_comma)+String(L",",1)+t_str.Slice(t_dl-t_comma);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<245>");
			t_dl-=t_comma;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<249>");
	if((t_padleft)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<250>");
		int t_paddedLength=t_padleft+t_decimal+1;
		DBG_LOCAL(t_paddedLength,"paddedLength")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<251>");
		if(t_paddedLength<t_str.Length()){
			DBG_BLOCK();
			t_str=String(L"Error",5);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<252>");
		t_str=bb_functions_RSet(t_str,t_paddedLength,String(L" ",1));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<254>");
	return t_str;
}
int bb_audio_MusicState(){
	DBG_ENTER("MusicState")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<97>");
	int t_=bb_audio_device->MusicState();
	return t_;
}
c_SoundPlayer::c_SoundPlayer(){
}
int c_SoundPlayer::m_channel;
void c_SoundPlayer::mark(){
	Object::mark();
}
String c_SoundPlayer::debug(){
	String t="(SoundPlayer)\n";
	t+=dbg_decl("channel",&c_SoundPlayer::m_channel);
	return t;
}
int bb_input_MouseHit(int t_button){
	DBG_ENTER("MouseHit")
	DBG_LOCAL(t_button,"button")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<66>");
	int t_=bb_input_device->p_KeyHit(1+t_button);
	return t_;
}
int bb_input_TouchHit(int t_index){
	DBG_ENTER("TouchHit")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<84>");
	int t_=bb_input_device->p_KeyHit(384+t_index);
	return t_;
}
int bb_input_TouchDown(int t_index){
	DBG_ENTER("TouchDown")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<80>");
	int t_=((bb_input_device->p_KeyDown(384+t_index))?1:0);
	return t_;
}
Float bb_input_TouchX(int t_index){
	DBG_ENTER("TouchX")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<72>");
	Float t_=bb_input_device->p_TouchX(t_index);
	return t_;
}
Float bb_input_TouchY(int t_index){
	DBG_ENTER("TouchY")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<76>");
	Float t_=bb_input_device->p_TouchY(t_index);
	return t_;
}
int bb_input_MouseDown(int t_button){
	DBG_ENTER("MouseDown")
	DBG_LOCAL(t_button,"button")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<62>");
	int t_=((bb_input_device->p_KeyDown(1+t_button))?1:0);
	return t_;
}
int bb_input_KeyHit(int t_key){
	DBG_ENTER("KeyHit")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<40>");
	int t_=bb_input_device->p_KeyHit(t_key);
	return t_;
}
int bb_input_KeyDown(int t_key){
	DBG_ENTER("KeyDown")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/input.monkey<36>");
	int t_=((bb_input_device->p_KeyDown(t_key))?1:0);
	return t_;
}
int bb_audio_SetMusicVolume(Float t_volume){
	DBG_ENTER("SetMusicVolume")
	DBG_LOCAL(t_volume,"volume")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<101>");
	bb_audio_device->SetMusicVolume(t_volume);
	return 0;
}
int bb_audio_SetChannelVolume(int t_channel,Float t_volume){
	DBG_ENTER("SetChannelVolume")
	DBG_LOCAL(t_channel,"channel")
	DBG_LOCAL(t_volume,"volume")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<69>");
	bb_audio_device->SetVolume(t_channel,t_volume);
	return 0;
}
c_Node3::c_Node3(){
	m_key=String();
	m_right=0;
	m_left=0;
	m_value=0;
	m_color=0;
	m_parent=0;
}
c_Node3* c_Node3::m_new(String t_key,c_Screen* t_value,int t_color,c_Node3* t_parent){
	DBG_ENTER("Node.new")
	c_Node3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_LOCAL(t_color,"color")
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>");
	this->m_key=t_key;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>");
	gc_assign(this->m_value,t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>");
	this->m_color=t_color;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>");
	gc_assign(this->m_parent,t_parent);
	return this;
}
c_Node3* c_Node3::m_new2(){
	DBG_ENTER("Node.new")
	c_Node3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>");
	return this;
}
c_Node3* c_Node3::p_NextNode(){
	DBG_ENTER("Node.NextNode")
	c_Node3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>");
	c_Node3* t_node=0;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>");
	if((m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>");
		t_node=m_right;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>");
		while((t_node->m_left)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>");
			t_node=t_node->m_left;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>");
		return t_node;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>");
	t_node=this;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>");
	c_Node3* t_parent=this->m_parent;
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>");
	while(((t_parent)!=0) && t_node==t_parent->m_right){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>");
		t_node=t_parent;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>");
		t_parent=t_parent->m_parent;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>");
	return t_parent;
}
void c_Node3::mark(){
	Object::mark();
	gc_mark_q(m_right);
	gc_mark_q(m_left);
	gc_mark_q(m_value);
	gc_mark_q(m_parent);
}
String c_Node3::debug(){
	String t="(Node)\n";
	t+=dbg_decl("key",&m_key);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("color",&m_color);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("left",&m_left);
	t+=dbg_decl("right",&m_right);
	return t;
}
String bb_functions_StripExt(String t_path){
	DBG_ENTER("StripExt")
	DBG_LOCAL(t_path,"path")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<194>");
	int t_i=t_path.FindLast(String(L".",1));
	DBG_LOCAL(t_i,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<195>");
	if(t_i!=-1 && t_path.Find(String(L"/",1),t_i+1)==-1){
		DBG_BLOCK();
		String t_=t_path.Slice(0,t_i);
		return t_;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<196>");
	return t_path;
}
String bb_functions_StripDir(String t_path){
	DBG_ENTER("StripDir")
	DBG_LOCAL(t_path,"path")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<188>");
	int t_i=t_path.FindLast(String(L"/",1));
	DBG_LOCAL(t_i,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<189>");
	if(t_i!=-1){
		DBG_BLOCK();
		String t_=t_path.Slice(t_i+1);
		return t_;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<190>");
	return t_path;
}
String bb_functions_StripAll(String t_path){
	DBG_ENTER("StripAll")
	DBG_LOCAL(t_path,"path")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<200>");
	String t_=bb_functions_StripDir(bb_functions_StripExt(t_path));
	return t_;
}
c_Image* bb_functions_LoadAnimBitmap(String t_path,int t_w,int t_h,int t_count,c_Image* t_tmpImage){
	DBG_ENTER("LoadAnimBitmap")
	DBG_LOCAL(t_path,"path")
	DBG_LOCAL(t_w,"w")
	DBG_LOCAL(t_h,"h")
	DBG_LOCAL(t_count,"count")
	DBG_LOCAL(t_tmpImage,"tmpImage")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<115>");
	t_tmpImage=bb_graphics_LoadImage(t_path,1,c_Image::m_DefaultFlags);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<117>");
	bb_assert_AssertNotNull((t_tmpImage),String(L"Error loading bitmap ",21)+t_path);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<119>");
	c_Image* t_pointer=t_tmpImage->p_GrabImage(0,0,t_w,t_h,t_count,1);
	DBG_LOCAL(t_pointer,"pointer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<121>");
	return t_pointer;
}
c_Image* bb_functions_LoadBitmap(String t_path,int t_flags){
	DBG_ENTER("LoadBitmap")
	DBG_LOCAL(t_path,"path")
	DBG_LOCAL(t_flags,"flags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<106>");
	c_Image* t_pointer=bb_graphics_LoadImage(t_path,1,t_flags);
	DBG_LOCAL(t_pointer,"pointer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<108>");
	bb_assert_AssertNotNull((t_pointer),String(L"Error loading bitmap ",21)+t_path);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<110>");
	return t_pointer;
}
c_MapKeys2::c_MapKeys2(){
	m_map=0;
}
c_MapKeys2* c_MapKeys2::m_new(c_Map4* t_map){
	DBG_ENTER("MapKeys.new")
	c_MapKeys2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_map,"map")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>");
	gc_assign(this->m_map,t_map);
	return this;
}
c_MapKeys2* c_MapKeys2::m_new2(){
	DBG_ENTER("MapKeys.new")
	c_MapKeys2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>");
	return this;
}
c_KeyEnumerator2* c_MapKeys2::p_ObjectEnumerator(){
	DBG_ENTER("MapKeys.ObjectEnumerator")
	c_MapKeys2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>");
	c_KeyEnumerator2* t_=(new c_KeyEnumerator2)->m_new(m_map->p_FirstNode());
	return t_;
}
void c_MapKeys2::mark(){
	Object::mark();
	gc_mark_q(m_map);
}
String c_MapKeys2::debug(){
	String t="(MapKeys)\n";
	t+=dbg_decl("map",&m_map);
	return t;
}
c_KeyEnumerator2::c_KeyEnumerator2(){
	m_node=0;
}
c_KeyEnumerator2* c_KeyEnumerator2::m_new(c_Node4* t_node){
	DBG_ENTER("KeyEnumerator.new")
	c_KeyEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>");
	gc_assign(this->m_node,t_node);
	return this;
}
c_KeyEnumerator2* c_KeyEnumerator2::m_new2(){
	DBG_ENTER("KeyEnumerator.new")
	c_KeyEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>");
	return this;
}
bool c_KeyEnumerator2::p_HasNext(){
	DBG_ENTER("KeyEnumerator.HasNext")
	c_KeyEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>");
	bool t_=m_node!=0;
	return t_;
}
String c_KeyEnumerator2::p_NextObject(){
	DBG_ENTER("KeyEnumerator.NextObject")
	c_KeyEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>");
	c_Node4* t_t=m_node;
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>");
	gc_assign(m_node,m_node->p_NextNode());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>");
	return t_t->m_key;
}
void c_KeyEnumerator2::mark(){
	Object::mark();
	gc_mark_q(m_node);
}
String c_KeyEnumerator2::debug(){
	String t="(KeyEnumerator)\n";
	t+=dbg_decl("node",&m_node);
	return t;
}
c_Node4::c_Node4(){
	m_left=0;
	m_right=0;
	m_parent=0;
	m_key=String();
	m_value=0;
}
c_Node4* c_Node4::p_NextNode(){
	DBG_ENTER("Node.NextNode")
	c_Node4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>");
	c_Node4* t_node=0;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>");
	if((m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>");
		t_node=m_right;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>");
		while((t_node->m_left)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>");
			t_node=t_node->m_left;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>");
		return t_node;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>");
	t_node=this;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>");
	c_Node4* t_parent=this->m_parent;
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>");
	while(((t_parent)!=0) && t_node==t_parent->m_right){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>");
		t_node=t_parent;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>");
		t_parent=t_parent->m_parent;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>");
	return t_parent;
}
void c_Node4::mark(){
	Object::mark();
	gc_mark_q(m_left);
	gc_mark_q(m_right);
	gc_mark_q(m_parent);
	gc_mark_q(m_value);
}
String c_Node4::debug(){
	String t="(Node)\n";
	t+=dbg_decl("key",&m_key);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("left",&m_left);
	t+=dbg_decl("right",&m_right);
	return t;
}
c_Sound::c_Sound(){
	m_sample=0;
}
c_Sound* c_Sound::m_new(gxtkSample* t_sample){
	DBG_ENTER("Sound.new")
	c_Sound *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_sample,"sample")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<28>");
	gc_assign(this->m_sample,t_sample);
	return this;
}
c_Sound* c_Sound::m_new2(){
	DBG_ENTER("Sound.new")
	c_Sound *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<25>");
	return this;
}
void c_Sound::mark(){
	Object::mark();
	gc_mark_q(m_sample);
}
String c_Sound::debug(){
	String t="(Sound)\n";
	t+=dbg_decl("sample",&m_sample);
	return t;
}
c_Sound* bb_audio_LoadSound(String t_path){
	DBG_ENTER("LoadSound")
	DBG_LOCAL(t_path,"path")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<43>");
	gxtkSample* t_sample=bb_audio_device->LoadSample(bb_data_FixDataPath(t_path));
	DBG_LOCAL(t_sample,"sample")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<44>");
	if((t_sample)!=0){
		DBG_BLOCK();
		c_Sound* t_=(new c_Sound)->m_new(t_sample);
		return t_;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<45>");
	return 0;
}
c_Sound* bb_functions_LoadSoundSample(String t_path){
	DBG_ENTER("LoadSoundSample")
	DBG_LOCAL(t_path,"path")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<125>");
	c_Sound* t_pointer=bb_audio_LoadSound(t_path);
	DBG_LOCAL(t_pointer,"pointer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<126>");
	bb_assert_AssertNotNull((t_pointer),String(L"Error loading sound ",20)+t_path);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<127>");
	return t_pointer;
}
int bb_audio_PlayMusic(String t_path,int t_flags){
	DBG_ENTER("PlayMusic")
	DBG_LOCAL(t_path,"path")
	DBG_LOCAL(t_flags,"flags")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/audio.monkey<81>");
	int t_=bb_audio_device->PlayMusic(bb_data_FixDataPath(t_path),t_flags);
	return t_;
}
Float bb_framework_defaultFadeTime;
c_MapKeys3::c_MapKeys3(){
	m_map=0;
}
c_MapKeys3* c_MapKeys3::m_new(c_Map2* t_map){
	DBG_ENTER("MapKeys.new")
	c_MapKeys3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_map,"map")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<503>");
	gc_assign(this->m_map,t_map);
	return this;
}
c_MapKeys3* c_MapKeys3::m_new2(){
	DBG_ENTER("MapKeys.new")
	c_MapKeys3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<500>");
	return this;
}
c_KeyEnumerator3* c_MapKeys3::p_ObjectEnumerator(){
	DBG_ENTER("MapKeys.ObjectEnumerator")
	c_MapKeys3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<507>");
	c_KeyEnumerator3* t_=(new c_KeyEnumerator3)->m_new(m_map->p_FirstNode());
	return t_;
}
void c_MapKeys3::mark(){
	Object::mark();
	gc_mark_q(m_map);
}
String c_MapKeys3::debug(){
	String t="(MapKeys)\n";
	t+=dbg_decl("map",&m_map);
	return t;
}
c_KeyEnumerator3::c_KeyEnumerator3(){
	m_node=0;
}
c_KeyEnumerator3* c_KeyEnumerator3::m_new(c_Node3* t_node){
	DBG_ENTER("KeyEnumerator.new")
	c_KeyEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<459>");
	gc_assign(this->m_node,t_node);
	return this;
}
c_KeyEnumerator3* c_KeyEnumerator3::m_new2(){
	DBG_ENTER("KeyEnumerator.new")
	c_KeyEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<456>");
	return this;
}
bool c_KeyEnumerator3::p_HasNext(){
	DBG_ENTER("KeyEnumerator.HasNext")
	c_KeyEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<463>");
	bool t_=m_node!=0;
	return t_;
}
String c_KeyEnumerator3::p_NextObject(){
	DBG_ENTER("KeyEnumerator.NextObject")
	c_KeyEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<467>");
	c_Node3* t_t=m_node;
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<468>");
	gc_assign(m_node,m_node->p_NextNode());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<469>");
	return t_t->m_key;
}
void c_KeyEnumerator3::mark(){
	Object::mark();
	gc_mark_q(m_node);
}
String c_KeyEnumerator3::debug(){
	String t="(KeyEnumerator)\n";
	t+=dbg_decl("node",&m_node);
	return t;
}
String bb_app_LoadString(String t_path){
	DBG_ENTER("LoadString")
	DBG_LOCAL(t_path,"path")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/app.monkey<147>");
	String t_=bb_app__game->LoadString(bb_data_FixDataPath(t_path));
	return t_;
}
void bb_assert_AssertNotEqualInt(int t_val,int t_expected,String t_msg){
	DBG_ENTER("AssertNotEqualInt")
	DBG_LOCAL(t_val,"val")
	DBG_LOCAL(t_expected,"expected")
	DBG_LOCAL(t_msg,"msg")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/assert.monkey<57>");
	if(t_val==t_expected){
		DBG_BLOCK();
		bb_assert_AssertError(t_msg+String(L" ",1)+String(t_val)+String(L"=",1)+String(t_expected));
	}
}
c_XMLParser::c_XMLParser(){
	m_str=String();
	m_tagsLength=0;
	m_quotesLength=0;
	m_pisLength=0;
	m_tags=Array<int >();
	m_tagType=Array<int >();
	m_quotes=Array<int >();
	m_pis=Array<int >();
	m_tagCount=0;
	m_quoteCount=0;
	m_piCount=0;
}
c_XMLParser* c_XMLParser::m_new(){
	DBG_ENTER("XMLParser.new")
	c_XMLParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<22>");
	return this;
}
void c_XMLParser::p_CacheControlCharacters(){
	DBG_ENTER("XMLParser.CacheControlCharacters")
	c_XMLParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<41>");
	m_tagsLength=128;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<42>");
	m_quotesLength=128;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<43>");
	m_pisLength=128;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<44>");
	gc_assign(m_tags,Array<int >(m_tagsLength));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<45>");
	gc_assign(m_tagType,Array<int >(m_tagsLength));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<46>");
	gc_assign(m_quotes,Array<int >(m_quotesLength));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<47>");
	gc_assign(m_pis,Array<int >(m_quotesLength));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<48>");
	m_tagCount=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<49>");
	m_quoteCount=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<50>");
	m_piCount=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<51>");
	bool t_inTag=false;
	DBG_LOCAL(t_inTag,"inTag")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<52>");
	bool t_inQuote=false;
	DBG_LOCAL(t_inQuote,"inQuote")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<53>");
	bool t_inComment=false;
	DBG_LOCAL(t_inComment,"inComment")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<54>");
	bool t_inCdata=false;
	DBG_LOCAL(t_inCdata,"inCdata")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<55>");
	bool t_inDoctype=false;
	DBG_LOCAL(t_inDoctype,"inDoctype")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<56>");
	bool t_inPi=false;
	DBG_LOCAL(t_inPi,"inPi")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<57>");
	int t_strlen=m_str.Length();
	DBG_LOCAL(t_strlen,"strlen")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<58>");
	for(int t_i=0;t_i<t_strlen;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<60>");
		if(t_inComment){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<61>");
			if((int)m_str.At(t_i)==62 && (int)m_str.At(t_i-1)==45 && (int)m_str.At(t_i-2)==45){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<62>");
				if(m_tagCount+1>=m_tagsLength){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<63>");
					m_tagsLength*=2;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<64>");
					gc_assign(m_tags,m_tags.Resize(m_tagsLength));
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<65>");
					gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<67>");
				m_tags.At(m_tagCount)=t_i;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<68>");
				m_tagType.At(m_tagCount)=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<69>");
				m_tagCount+=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<70>");
				t_inComment=false;
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<73>");
			if(t_inCdata){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<74>");
				if((int)m_str.At(t_i)==62 && (int)m_str.At(t_i-1)==93 && (int)m_str.At(t_i-2)==93){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<75>");
					if(m_tagCount+1>=m_tagsLength){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<76>");
						m_tagsLength*=2;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<77>");
						gc_assign(m_tags,m_tags.Resize(m_tagsLength));
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<78>");
						gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
					}
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<80>");
					m_tags.At(m_tagCount)=t_i;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<81>");
					m_tagType.At(m_tagCount)=2;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<82>");
					m_tagCount+=1;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<83>");
					t_inCdata=false;
				}
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<86>");
				if(t_inQuote){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<87>");
					if((int)m_str.At(t_i)==34){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<88>");
						if(m_quoteCount+1>=m_quotesLength){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<89>");
							m_quotesLength*=2;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<90>");
							gc_assign(m_quotes,m_quotes.Resize(m_quotesLength));
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<92>");
						m_quotes.At(m_quoteCount)=t_i;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<93>");
						m_quoteCount+=1;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<94>");
						t_inQuote=false;
					}
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<97>");
					if((int)m_str.At(t_i)==34){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<98>");
						if(m_quoteCount+1>=m_quotesLength){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<99>");
							m_quotesLength*=2;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<100>");
							gc_assign(m_quotes,m_quotes.Resize(m_quotesLength));
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<102>");
						m_quotes.At(m_quoteCount)=t_i;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<103>");
						m_quoteCount+=1;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<104>");
						t_inQuote=true;
					}else{
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<106>");
						if(t_inPi){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<107>");
							if((int)m_str.At(t_i)==62 && (int)m_str.At(t_i-1)==63){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<108>");
								if(m_piCount+1>=m_pisLength){
									DBG_BLOCK();
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<109>");
									m_pisLength*=2;
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<110>");
									gc_assign(m_pis,m_pis.Resize(m_pisLength));
								}
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<112>");
								m_pis.At(m_piCount)=t_i;
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<113>");
								m_piCount+=1;
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<114>");
								t_inPi=false;
							}
						}else{
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<117>");
							if(t_inDoctype){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<118>");
								if((int)m_str.At(t_i)==62){
									DBG_BLOCK();
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<119>");
									if(m_tagCount+1>=m_tagsLength){
										DBG_BLOCK();
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<120>");
										m_tagsLength*=2;
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<121>");
										gc_assign(m_tags,m_tags.Resize(m_tagsLength));
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<122>");
										gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
									}
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<124>");
									m_tags.At(m_tagCount)=t_i;
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<125>");
									m_tagType.At(m_tagCount)=3;
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<126>");
									m_tagCount+=1;
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<127>");
									t_inDoctype=false;
								}
							}else{
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<130>");
								if((int)m_str.At(t_i)==60){
									DBG_BLOCK();
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<132>");
									if(t_inTag){
										DBG_BLOCK();
										throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Invalid less than!",52),0);
									}
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<134>");
									if((int)m_str.At(t_i+1)==33){
										DBG_BLOCK();
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<136>");
										if((int)m_str.At(t_i+2)==45 && (int)m_str.At(t_i+3)==45){
											DBG_BLOCK();
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<137>");
											if(m_tagCount+1>=m_tagsLength){
												DBG_BLOCK();
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<138>");
												m_tagsLength*=2;
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<139>");
												gc_assign(m_tags,m_tags.Resize(m_tagsLength));
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<140>");
												gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
											}
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<142>");
											m_tags.At(m_tagCount)=t_i;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<143>");
											m_tagType.At(m_tagCount)=1;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<144>");
											m_tagCount+=1;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<145>");
											t_inComment=true;
										}else{
											DBG_BLOCK();
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<153>");
											if((int)m_str.At(t_i+2)==91 && ((int)m_str.At(t_i+3)==67 || (int)m_str.At(t_i+3)==99) && ((int)m_str.At(t_i+4)==68 || (int)m_str.At(t_i+4)==100) && ((int)m_str.At(t_i+5)==65 || (int)m_str.At(t_i+5)==97) && ((int)m_str.At(t_i+6)==84 || (int)m_str.At(t_i+6)==116) && ((int)m_str.At(t_i+7)==65 || (int)m_str.At(t_i+7)==97) && (int)m_str.At(t_i+8)==91){
												DBG_BLOCK();
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<154>");
												if(m_tagCount+1>=m_tagsLength){
													DBG_BLOCK();
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<155>");
													m_tagsLength*=2;
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<156>");
													gc_assign(m_tags,m_tags.Resize(m_tagsLength));
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<157>");
													gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
												}
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<159>");
												m_tags.At(m_tagCount)=t_i;
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<160>");
												m_tagType.At(m_tagCount)=2;
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<161>");
												m_tagCount+=1;
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<162>");
												t_inCdata=true;
											}else{
												DBG_BLOCK();
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<170>");
												if(((int)m_str.At(t_i+2)==68 || (int)m_str.At(t_i+2)==100) && ((int)m_str.At(t_i+3)==79 || (int)m_str.At(t_i+3)==111) && ((int)m_str.At(t_i+4)==67 || (int)m_str.At(t_i+4)==99) && ((int)m_str.At(t_i+5)==84 || (int)m_str.At(t_i+5)==116) && ((int)m_str.At(t_i+6)==89 || (int)m_str.At(t_i+6)==121) && ((int)m_str.At(t_i+7)==80 || (int)m_str.At(t_i+7)==112) && ((int)m_str.At(t_i+8)==69 || (int)m_str.At(t_i+8)==101)){
													DBG_BLOCK();
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<171>");
													if(m_tagCount+1>=m_tagsLength){
														DBG_BLOCK();
														DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<172>");
														m_tagsLength*=2;
														DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<173>");
														gc_assign(m_tags,m_tags.Resize(m_tagsLength));
														DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<174>");
														gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
													}
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<176>");
													m_tags.At(m_tagCount)=t_i;
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<177>");
													m_tagType.At(m_tagCount)=3;
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<178>");
													m_tagCount+=1;
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<179>");
													t_inDoctype=true;
												}else{
													DBG_BLOCK();
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<181>");
													throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Invalid prolog.",49),0);
												}
											}
										}
									}else{
										DBG_BLOCK();
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<184>");
										if((int)m_str.At(t_i+1)==63){
											DBG_BLOCK();
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<185>");
											if(m_piCount+1>=m_pisLength){
												DBG_BLOCK();
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<186>");
												m_pisLength*=2;
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<187>");
												gc_assign(m_pis,m_pis.Resize(m_pisLength));
											}
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<189>");
											m_pis.At(m_piCount)=t_i;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<190>");
											m_piCount+=1;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<191>");
											t_inPi=true;
										}else{
											DBG_BLOCK();
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<194>");
											if(m_tagCount+1>=m_tagsLength){
												DBG_BLOCK();
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<195>");
												m_tagsLength*=2;
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<196>");
												gc_assign(m_tags,m_tags.Resize(m_tagsLength));
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<197>");
												gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
											}
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<199>");
											m_tags.At(m_tagCount)=t_i;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<200>");
											m_tagType.At(m_tagCount)=0;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<201>");
											m_tagCount+=1;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<202>");
											t_inTag=true;
										}
									}
								}else{
									DBG_BLOCK();
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<205>");
									if((int)m_str.At(t_i)==62){
										DBG_BLOCK();
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<206>");
										if(!t_inTag){
											DBG_BLOCK();
											throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Invalid greater than!",55),0);
										}
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<207>");
										if(m_tagCount+1==m_tagsLength){
											DBG_BLOCK();
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<208>");
											m_tagsLength*=2;
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<209>");
											gc_assign(m_tags,m_tags.Resize(m_tagsLength));
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<210>");
											gc_assign(m_tagType,m_tagType.Resize(m_tagsLength));
										}
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<212>");
										m_tags.At(m_tagCount)=t_i;
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<213>");
										m_tagType.At(m_tagCount)=0;
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<214>");
										m_tagCount+=1;
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<215>");
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
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<218>");
	if(t_inQuote){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Unclosed quote!",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<219>");
	if(t_inTag){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Unclosed tag!",47),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<220>");
	if(t_inComment){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Unclosed comment!",51),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<221>");
	if(t_inCdata){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Unclosed cdata!",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<222>");
	if(t_inPi){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.CacheControlCharacters: Unclosed processing instruction!",66),0);
	}
}
void c_XMLParser::p_TrimString(int t_startIdx,int t_endIdx,Array<int > t_trimmed){
	DBG_ENTER("XMLParser.TrimString")
	c_XMLParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_startIdx,"startIdx")
	DBG_LOCAL(t_endIdx,"endIdx")
	DBG_LOCAL(t_trimmed,"trimmed")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<361>");
	int t_trimStart=t_startIdx;
	int t_trimEnd=t_endIdx;
	DBG_LOCAL(t_trimStart,"trimStart")
	DBG_LOCAL(t_trimEnd,"trimEnd")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<362>");
	while(t_trimEnd>t_trimStart){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<363>");
		int t_ch=(int)m_str.At(t_trimEnd-1);
		DBG_LOCAL(t_ch,"ch")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<364>");
		if(t_ch==13 || t_ch==10 || t_ch==32 || t_ch==9){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<365>");
			t_trimEnd-=1;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<367>");
			break;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<370>");
	while(t_trimStart<t_trimEnd){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<371>");
		int t_ch2=(int)m_str.At(t_trimStart);
		DBG_LOCAL(t_ch2,"ch")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<372>");
		if(t_ch2==13 || t_ch2==10 || t_ch2==32 || t_ch2==9){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<373>");
			t_trimStart+=1;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<375>");
			break;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<378>");
	t_trimmed.At(0)=t_trimStart;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<379>");
	t_trimmed.At(1)=t_trimEnd;
}
c_XMLElement* c_XMLParser::p_GetTagContents(int t_startIndex,int t_endIndex){
	DBG_ENTER("XMLParser.GetTagContents")
	c_XMLParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_startIndex,"startIndex")
	DBG_LOCAL(t_endIndex,"endIndex")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<228>");
	if(t_startIndex==t_endIndex){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.GetTagContents: Empty tag detected.",45),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<230>");
	c_XMLElement* t_e=(new c_XMLElement)->m_new();
	DBG_LOCAL(t_e,"e")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<231>");
	int t_a=0;
	bool t_singleQuoted=false;
	bool t_doubleQuoted=false;
	String t_key=String();
	String t_value=String();
	DBG_LOCAL(t_a,"a")
	DBG_LOCAL(t_singleQuoted,"singleQuoted")
	DBG_LOCAL(t_doubleQuoted,"doubleQuoted")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<234>");
	t_a=t_startIndex;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<235>");
	while(t_a<t_endIndex){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<236>");
		if((int)m_str.At(t_a)==32 || (int)m_str.At(t_a)==9 || (int)m_str.At(t_a)==10 || (int)m_str.At(t_a)==13){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<237>");
			t_e->m_name=m_str.Slice(t_startIndex,t_a);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<238>");
			t_a+=1;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<239>");
			break;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<240>");
			if(t_a==t_endIndex-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<241>");
				t_e->m_name=m_str.Slice(t_startIndex,t_endIndex);
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<243>");
		t_a+=1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<245>");
	t_startIndex=t_a;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<249>");
	if(t_e->m_name==String()){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.GetTagContents: Error reading tag name.",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<252>");
	while(t_startIndex<t_endIndex){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<254>");
		while(t_startIndex<t_endIndex && ((int)m_str.At(t_startIndex)==32 || (int)m_str.At(t_startIndex)==9 || (int)m_str.At(t_startIndex)==10 || (int)m_str.At(t_startIndex)==13)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<255>");
			t_startIndex+=1;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<259>");
		t_singleQuoted=false;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<260>");
		t_doubleQuoted=false;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<261>");
		t_key=String();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<262>");
		t_value=String();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<265>");
		t_a=t_startIndex;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<266>");
		while(t_a<t_endIndex){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<267>");
			if((int)m_str.At(t_a)==61 || (int)m_str.At(t_a)==32 || (int)m_str.At(t_a)==9 || (int)m_str.At(t_a)==10 || (int)m_str.At(t_a)==13 || t_a==t_endIndex-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<268>");
				if(t_a==t_endIndex-1){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<269>");
					t_key=m_str.Slice(t_startIndex,t_endIndex);
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<271>");
					t_key=m_str.Slice(t_startIndex,t_a);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<273>");
				t_a+=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<274>");
				break;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<276>");
			t_a+=1;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<278>");
		t_startIndex=t_a;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<281>");
		if(t_key==String()){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<282>");
			if(t_a<t_endIndex){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<283>");
				throw (new c_XMLParseException)->m_new(String(L"XMLParser.GetTagContents: Error reading attribute key.",54),0);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<285>");
				break;
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<290>");
		if((int)m_str.At(t_a-1)==61){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<291>");
			t_singleQuoted=false;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<292>");
			t_doubleQuoted=false;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<293>");
			while(t_a<t_endIndex){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<295>");
				if((int)m_str.At(t_a)==39 && !t_doubleQuoted){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<297>");
					if(t_a==t_startIndex){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<298>");
						t_singleQuoted=true;
					}else{
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<300>");
						if(!t_singleQuoted && !t_doubleQuoted){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<301>");
							throw (new c_XMLParseException)->m_new(String(L"XMLParser.GetTagContents: Unexpected single quote detected in attribute value.",78),0);
						}else{
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<304>");
							t_singleQuoted=false;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<305>");
							t_value=m_str.Slice(t_startIndex+1,t_a);
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<306>");
							t_a+=1;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<307>");
							break;
						}
					}
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<311>");
					if((int)m_str.At(t_a)==34 && !t_singleQuoted){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<313>");
						if(t_a==t_startIndex){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<314>");
							t_doubleQuoted=true;
						}else{
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<316>");
							if(!t_singleQuoted && !t_doubleQuoted){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<317>");
								throw (new c_XMLParseException)->m_new(String(L"XMLParser.GetTagContents: Unexpected double quote detected in attribute value.",78),0);
							}else{
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<320>");
								t_doubleQuoted=false;
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<321>");
								t_value=m_str.Slice(t_startIndex+1,t_a);
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<322>");
								t_a+=1;
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<323>");
								break;
							}
						}
					}else{
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<327>");
						if(t_a==t_endIndex-1 || !t_singleQuoted && !t_doubleQuoted && ((int)m_str.At(t_a)==32 || (int)m_str.At(t_a)==9 || (int)m_str.At(t_a)==10 || (int)m_str.At(t_a)==13)){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<328>");
							if(t_a==t_endIndex-1){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<329>");
								t_value=m_str.Slice(t_startIndex,t_endIndex);
							}else{
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<331>");
								t_value=m_str.Slice(t_startIndex,t_a);
							}
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<333>");
							t_a+=1;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<334>");
							break;
						}
					}
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<336>");
				t_a+=1;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<338>");
			t_startIndex=t_a;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<339>");
			t_value=bb_xml_UnescapeXMLString(t_value);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<341>");
			if(t_singleQuoted || t_doubleQuoted){
				DBG_BLOCK();
				throw (new c_XMLParseException)->m_new(String(L"XMLParser.GetTagContents: Unclosed quote detected.",50),0);
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<345>");
		t_e->p_SetAttribute(t_key,t_value);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<347>");
		if(t_a>=t_endIndex){
			DBG_BLOCK();
			break;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<349>");
	return t_e;
}
c_XMLDocument* c_XMLParser::p_ParseString(String t_str){
	DBG_ENTER("XMLParser.ParseString")
	c_XMLParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<384>");
	this->m_str=t_str;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<386>");
	c_XMLDocument* t_doc=(new c_XMLDocument)->m_new(String());
	DBG_LOCAL(t_doc,"doc")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<387>");
	c_ArrayList3* t_elements=(new c_ArrayList3)->m_new();
	DBG_LOCAL(t_elements,"elements")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<388>");
	c_XMLElement* t_thisE=0;
	c_XMLElement* t_newE=0;
	DBG_LOCAL(t_thisE,"thisE")
	DBG_LOCAL(t_newE,"newE")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<389>");
	int t_index=0;
	int t_a=0;
	int t_b=0;
	int t_c=0;
	int t_nextIndex=0;
	DBG_LOCAL(t_index,"index")
	DBG_LOCAL(t_a,"a")
	DBG_LOCAL(t_b,"b")
	DBG_LOCAL(t_c,"c")
	DBG_LOCAL(t_nextIndex,"nextIndex")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<390>");
	Array<int > t_trimmed=Array<int >(2);
	DBG_LOCAL(t_trimmed,"trimmed")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<393>");
	p_CacheControlCharacters();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<396>");
	if(m_tagCount==0){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.ParseString: Something seriously wrong... no tags!",60),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<399>");
	t_index=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<400>");
	t_a=m_pis.At(t_index)+2;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<401>");
	t_b=m_pis.At(t_index+1)-1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<402>");
	while(t_index<m_piCount){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<403>");
		p_TrimString(t_a,t_b,t_trimmed);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<404>");
		if(t_trimmed.At(0)!=t_trimmed.At(1)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<405>");
			t_newE=p_GetTagContents(t_trimmed.At(0),t_trimmed.At(1));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<406>");
			t_newE->m_pi=true;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<407>");
			t_doc->m_pi->p_Add(t_newE);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<408>");
			t_newE=0;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<410>");
			throw (new c_XMLParseException)->m_new(String(L"XMLParser.ParseString: Empty processing instruction.",52),0);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<412>");
		t_index+=2;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<416>");
	t_index=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<417>");
	while(t_index+1<m_tagCount){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<419>");
		if(m_tagType.At(t_index)==1){
			DBG_BLOCK();
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<423>");
			if(m_tagType.At(t_index)==2){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<425>");
				t_a=m_tags.At(t_index)+9;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<426>");
				t_b=m_tags.At(t_index+1)-2;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<429>");
				t_newE=(new c_XMLElement)->m_new();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<430>");
				t_newE->m_cdata=true;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<431>");
				t_newE->m_value=t_str.Slice(t_a,t_b);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<432>");
				gc_assign(t_newE->m_parent,t_thisE);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<433>");
				t_thisE->p_AddChild(t_newE);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<434>");
				t_newE=0;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<439>");
				t_a=m_tags.At(t_index)+1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<440>");
				t_b=m_tags.At(t_index+1);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<443>");
				p_TrimString(t_a,t_b,t_trimmed);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<446>");
				if(t_trimmed.At(0)==t_trimmed.At(1)){
					DBG_BLOCK();
					throw (new c_XMLParseException)->m_new(String(L"XMLParser.ParseString: Empty tag.",33),0);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<449>");
				if((int)t_str.At(t_trimmed.At(0))==47){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<451>");
					if(t_thisE==0){
						DBG_BLOCK();
						throw (new c_XMLParseException)->m_new(String(L"XMLParser.ParseString: Closing tag found outside main document tag.",67),0);
					}
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<454>");
					t_trimmed.At(0)+=1;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<457>");
					if(t_trimmed.At(1)-t_trimmed.At(0)!=t_thisE->m_name.Length()){
						DBG_BLOCK();
						throw (new c_XMLParseException)->m_new(String(L"Closing tag \"",13)+t_str.Slice(t_trimmed.At(0),t_trimmed.At(1))+String(L"\" does not match opening tag \"",30)+t_thisE->m_name+String(L"\"",1),0);
					}
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<460>");
					for(int t_nameIdx=0;t_nameIdx<t_thisE->m_name.Length();t_nameIdx=t_nameIdx+1){
						DBG_BLOCK();
						DBG_LOCAL(t_nameIdx,"nameIdx")
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<461>");
						if((int)t_str.At(t_trimmed.At(0)+t_nameIdx)!=(int)t_thisE->m_name.At(t_nameIdx)){
							DBG_BLOCK();
							throw (new c_XMLParseException)->m_new(String(L"Closing tag \"",13)+t_str.Slice(t_trimmed.At(0),t_trimmed.At(1))+String(L"\" does not match opening tag \"",30)+t_thisE->m_name+String(L"\"",1),0);
						}
					}
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<465>");
					if(!t_elements->p_IsEmpty()){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<466>");
						t_thisE=t_elements->p_RemoveLast();
					}else{
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<469>");
						break;
					}
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<473>");
					if((int)t_str.At(t_trimmed.At(1)-1)==47){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<475>");
						t_trimmed.At(1)-=1;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<478>");
						t_newE=p_GetTagContents(t_trimmed.At(0),t_trimmed.At(1));
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<481>");
						if(t_doc->m_root==0){
							DBG_BLOCK();
							gc_assign(t_doc->m_root,t_newE);
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<482>");
						if(t_thisE!=0){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<483>");
							t_thisE->p_AddChild(t_newE);
						}else{
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<486>");
							break;
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<488>");
						t_newE=0;
					}else{
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<493>");
						t_newE=p_GetTagContents(t_trimmed.At(0),t_trimmed.At(1));
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<495>");
						if(t_doc->m_root==0){
							DBG_BLOCK();
							gc_assign(t_doc->m_root,t_newE);
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<498>");
						if(t_thisE!=0){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<499>");
							t_thisE->p_AddChild(t_newE);
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<503>");
						t_elements->p_AddLast(t_thisE);
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<506>");
						t_thisE=t_newE;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<507>");
						t_newE=0;
					}
				}
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<512>");
		t_index+=1;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<513>");
		if(t_index<m_tagCount){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<514>");
			t_a=m_tags.At(t_index)+1;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<515>");
			t_b=m_tags.At(t_index+1);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<516>");
			p_TrimString(t_a,t_b,t_trimmed);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<517>");
			if(t_trimmed.At(0)!=t_trimmed.At(1)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<518>");
				if(t_thisE!=0){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<519>");
					t_thisE->m_value=t_thisE->m_value+bb_xml_UnescapeXMLString(t_str.Slice(t_trimmed.At(0),t_trimmed.At(1)));
				}
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<527>");
		t_index+=1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<529>");
	if(t_doc->m_root==0){
		DBG_BLOCK();
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.ParseString: Error parsing XML: no document tag found.",64),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<530>");
	return t_doc;
}
c_XMLDocument* c_XMLParser::p_ParseFile(String t_filename){
	DBG_ENTER("XMLParser.ParseFile")
	c_XMLParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_filename,"filename")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<353>");
	String t_xmlString=bb_app_LoadString(t_filename);
	DBG_LOCAL(t_xmlString,"xmlString")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<354>");
	if(!((t_xmlString).Length()!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<355>");
		throw (new c_XMLParseException)->m_new(String(L"XMLParser.ParseFile: Error: Cannot load ",40)+t_filename,0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<357>");
	c_XMLDocument* t_=p_ParseString(t_xmlString);
	return t_;
}
void c_XMLParser::mark(){
	Object::mark();
	gc_mark_q(m_tags);
	gc_mark_q(m_tagType);
	gc_mark_q(m_quotes);
	gc_mark_q(m_pis);
}
String c_XMLParser::debug(){
	String t="(XMLParser)\n";
	t+=dbg_decl("str",&m_str);
	t+=dbg_decl("tags",&m_tags);
	t+=dbg_decl("tagType",&m_tagType);
	t+=dbg_decl("tagCount",&m_tagCount);
	t+=dbg_decl("tagsLength",&m_tagsLength);
	t+=dbg_decl("quotes",&m_quotes);
	t+=dbg_decl("quoteCount",&m_quoteCount);
	t+=dbg_decl("quotesLength",&m_quotesLength);
	t+=dbg_decl("pis",&m_pis);
	t+=dbg_decl("piCount",&m_piCount);
	t+=dbg_decl("pisLength",&m_pisLength);
	return t;
}
c_XMLDocument::c_XMLDocument(){
	m_root=0;
	m_pi=(new c_ArrayList3)->m_new();
}
c_XMLDocument* c_XMLDocument::m_new(String t_rootName){
	DBG_ENTER("XMLDocument.new")
	c_XMLDocument *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_rootName,"rootName")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<546>");
	if(t_rootName!=String()){
		DBG_BLOCK();
		gc_assign(m_root,(new c_XMLElement)->m_new2(t_rootName,0));
	}
	return this;
}
c_XMLDocument* c_XMLDocument::m_new2(c_XMLElement* t_root){
	DBG_ENTER("XMLDocument.new")
	c_XMLDocument *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_root,"root")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<550>");
	gc_assign(this->m_root,t_root);
	return this;
}
c_XMLElement* c_XMLDocument::p_Root(){
	DBG_ENTER("XMLDocument.Root")
	c_XMLDocument *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<570>");
	return m_root;
}
void c_XMLDocument::mark(){
	Object::mark();
	gc_mark_q(m_root);
	gc_mark_q(m_pi);
}
String c_XMLDocument::debug(){
	String t="(XMLDocument)\n";
	t+=dbg_decl("root",&m_root);
	t+=dbg_decl("pi",&m_pi);
	return t;
}
c_XMLElement::c_XMLElement(){
	m_parent=0;
	m_name=String();
	m_children=(new c_ArrayList3)->m_new();
	m_attributes=(new c_ArrayList4)->m_new();
	m_pi=false;
	m_cdata=false;
	m_value=String();
}
c_XMLElement* c_XMLElement::m_new(){
	DBG_ENTER("XMLElement.new")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_XMLElement* c_XMLElement::m_new2(String t_name,c_XMLElement* t_parent){
	DBG_ENTER("XMLElement.new")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<630>");
	gc_assign(this->m_parent,t_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<631>");
	this->m_name=t_name;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<632>");
	if(t_parent!=0){
		DBG_BLOCK();
		t_parent->m_children->p_Add(this);
	}
	return this;
}
String c_XMLElement::p_SetAttribute(String t_name,String t_value){
	DBG_ENTER("XMLElement.SetAttribute")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<675>");
	if(!((t_name).Length()!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"XMLElement.SetAttribute: name must not be empty",47),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<676>");
	for(int t_i=0;t_i<m_attributes->p_Size();t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<677>");
		c_XMLAttribute* t_att=m_attributes->p_Get2(t_i);
		DBG_LOCAL(t_att,"att")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<678>");
		if(t_att->m_name==t_name){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<679>");
			String t_old=t_att->m_value;
			DBG_LOCAL(t_old,"old")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<680>");
			t_att->m_value=t_value;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<681>");
			return t_old;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<684>");
	m_attributes->p_Add2((new c_XMLAttribute)->m_new(t_name,t_value));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<685>");
	return String();
}
void c_XMLElement::p_AddChild(c_XMLElement* t_child){
	DBG_ENTER("XMLElement.AddChild")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<650>");
	if(m_children->p_Contains2(t_child)){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<651>");
	m_children->p_Add(t_child);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<652>");
	gc_assign(t_child->m_parent,this);
}
String c_XMLElement::p_GetAttribute(String t_name,String t_defaultValue){
	DBG_ENTER("XMLElement.GetAttribute")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_defaultValue,"defaultValue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<665>");
	if(!((t_name).Length()!=0)){
		DBG_BLOCK();
		return String();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<666>");
	for(int t_i=0;t_i<m_attributes->p_Size();t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<667>");
		c_XMLAttribute* t_att=m_attributes->p_Get2(t_i);
		DBG_LOCAL(t_att,"att")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<668>");
		if(t_att->m_name==t_name){
			DBG_BLOCK();
			return t_att->m_value;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<670>");
	return t_defaultValue;
}
bool c_XMLElement::p_MatchesAttribute(String t_check){
	DBG_ENTER("XMLElement.MatchesAttribute")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_check,"check")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<806>");
	c_IEnumerator4* t_=m_attributes->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_XMLAttribute* t_attr=t_->p_NextObject();
		DBG_LOCAL(t_attr,"attr")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<807>");
		if(t_attr->p_Matches(t_check)){
			DBG_BLOCK();
			return true;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<809>");
	return false;
}
c_ArrayList3* c_XMLElement::p_GetChildrenByName(String t_findName,String t_att1,String t_att2,String t_att3,String t_att4,String t_att5,String t_att6,String t_att7,String t_att8,String t_att9,String t_att10){
	DBG_ENTER("XMLElement.GetChildrenByName")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_findName,"findName")
	DBG_LOCAL(t_att1,"att1")
	DBG_LOCAL(t_att2,"att2")
	DBG_LOCAL(t_att3,"att3")
	DBG_LOCAL(t_att4,"att4")
	DBG_LOCAL(t_att5,"att5")
	DBG_LOCAL(t_att6,"att6")
	DBG_LOCAL(t_att7,"att7")
	DBG_LOCAL(t_att8,"att8")
	DBG_LOCAL(t_att9,"att9")
	DBG_LOCAL(t_att10,"att10")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<765>");
	if(!((t_findName).Length()!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"XMLElement.GetChildrenByName: findName must not be empty",56),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<766>");
	c_ArrayList3* t_rv=(new c_ArrayList3)->m_new();
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<767>");
	c_IEnumerator3* t_=m_children->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_XMLElement* t_element=t_->p_NextObject();
		DBG_LOCAL(t_element,"element")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<768>");
		if(t_element->m_name==t_findName){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<769>");
			if(((t_att1).Length()!=0) && !t_element->p_MatchesAttribute(t_att1)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<770>");
			if(((t_att2).Length()!=0) && !t_element->p_MatchesAttribute(t_att2)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<771>");
			if(((t_att3).Length()!=0) && !t_element->p_MatchesAttribute(t_att3)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<772>");
			if(((t_att4).Length()!=0) && !t_element->p_MatchesAttribute(t_att4)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<773>");
			if(((t_att5).Length()!=0) && !t_element->p_MatchesAttribute(t_att5)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<774>");
			if(((t_att6).Length()!=0) && !t_element->p_MatchesAttribute(t_att6)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<775>");
			if(((t_att7).Length()!=0) && !t_element->p_MatchesAttribute(t_att7)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<776>");
			if(((t_att8).Length()!=0) && !t_element->p_MatchesAttribute(t_att8)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<777>");
			if(((t_att9).Length()!=0) && !t_element->p_MatchesAttribute(t_att9)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<778>");
			if(((t_att10).Length()!=0) && !t_element->p_MatchesAttribute(t_att10)){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<779>");
			t_rv->p_Add(t_element);
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<782>");
	return t_rv;
}
c_ArrayList3* c_XMLElement::p_Children(){
	DBG_ENTER("XMLElement.Children")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<814>");
	return m_children;
}
String c_XMLElement::p_Name(){
	DBG_ENTER("XMLElement.Name")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<822>");
	return m_name;
}
void c_XMLElement::p_Name2(String t_name){
	DBG_ENTER("XMLElement.Name")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<826>");
	if(!((t_name).Length()!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"XMLElement.Name: name must not be empty",39),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<827>");
	this->m_name=t_name;
}
bool c_XMLElement::p_HasAttribute(String t_name){
	DBG_ENTER("XMLElement.HasAttribute")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<656>");
	if(!((t_name).Length()!=0)){
		DBG_BLOCK();
		return false;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<657>");
	for(int t_i=0;t_i<m_attributes->p_Size();t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<658>");
		c_XMLAttribute* t_att=m_attributes->p_Get2(t_i);
		DBG_LOCAL(t_att,"att")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<659>");
		if(t_att->m_name==t_name){
			DBG_BLOCK();
			return true;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<661>");
	return false;
}
String c_XMLElement::p_Value(){
	DBG_ENTER("XMLElement.Value")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<831>");
	return m_value;
}
void c_XMLElement::p_Value2(String t_value){
	DBG_ENTER("XMLElement.Value")
	c_XMLElement *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<835>");
	this->m_value=t_value;
}
void c_XMLElement::mark(){
	Object::mark();
	gc_mark_q(m_parent);
	gc_mark_q(m_children);
	gc_mark_q(m_attributes);
}
String c_XMLElement::debug(){
	String t="(XMLElement)\n";
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("attributes",&m_attributes);
	t+=dbg_decl("children",&m_children);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("pi",&m_pi);
	t+=dbg_decl("cdata",&m_cdata);
	return t;
}
c_ICollection3::c_ICollection3(){
}
c_ICollection3* c_ICollection3::m_new(){
	DBG_ENTER("ICollection.new")
	c_ICollection3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>");
	return this;
}
c_IEnumerator3* c_ICollection3::p_ObjectEnumerator(){
	DBG_ENTER("ICollection.ObjectEnumerator")
	c_ICollection3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>");
	c_IEnumerator3* t_=p_Enumerator();
	return t_;
}
void c_ICollection3::mark(){
	Object::mark();
}
String c_ICollection3::debug(){
	String t="(ICollection)\n";
	return t;
}
c_IList3::c_IList3(){
	m_modCount=0;
}
c_IList3* c_IList3::m_new(){
	DBG_ENTER("IList.new")
	c_IList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>");
	c_ICollection3::m_new();
	return this;
}
void c_IList3::p_RangeCheck(int t_index){
	DBG_ENTER("IList.RangeCheck")
	c_IList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>");
	int t_size=this->p_Size();
	DBG_LOCAL(t_size,"size")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>");
	if(t_index<0 || t_index>=t_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"IList.RangeCheck: Index out of bounds: ",39)+String(t_index)+String(L" is not 0<=index<",17)+String(t_size),0);
	}
}
c_IEnumerator3* c_IList3::p_Enumerator(){
	DBG_ENTER("IList.Enumerator")
	c_IList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>");
	c_IEnumerator3* t_=((new c_ListEnumerator3)->m_new(this));
	return t_;
}
void c_IList3::mark(){
	c_ICollection3::mark();
}
String c_IList3::debug(){
	String t="(IList)\n";
	t=c_ICollection3::debug()+t;
	t+=dbg_decl("modCount",&m_modCount);
	return t;
}
c_ArrayList3::c_ArrayList3(){
	m_elements=Array<Object* >();
	m_size=0;
}
c_ArrayList3* c_ArrayList3::m_new(){
	DBG_ENTER("ArrayList.new")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>");
	c_IList3::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>");
	gc_assign(this->m_elements,Array<Object* >(10));
	return this;
}
c_ArrayList3* c_ArrayList3::m_new2(int t_initialCapacity){
	DBG_ENTER("ArrayList.new")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_initialCapacity,"initialCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>");
	c_IList3::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>");
	if(t_initialCapacity<0){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Capacity must be >= 0",36),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>");
	gc_assign(this->m_elements,Array<Object* >(t_initialCapacity));
	return this;
}
c_ArrayList3* c_ArrayList3::m_new3(c_ICollection3* t_c){
	DBG_ENTER("ArrayList.new")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_c,"c")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>");
	c_IList3::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>");
	if(!((t_c)!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Source collection must not be null",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>");
	gc_assign(m_elements,t_c->p_ToArray());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>");
	m_size=m_elements.Length();
	return this;
}
void c_ArrayList3::p_EnsureCapacity(int t_minCapacity){
	DBG_ENTER("ArrayList.EnsureCapacity")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_minCapacity,"minCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>");
	int t_oldCapacity=m_elements.Length();
	DBG_LOCAL(t_oldCapacity,"oldCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>");
	if(t_minCapacity>t_oldCapacity){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>");
		int t_newCapacity=t_oldCapacity*3/2+1;
		DBG_LOCAL(t_newCapacity,"newCapacity")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>");
		if(t_newCapacity<t_minCapacity){
			DBG_BLOCK();
			t_newCapacity=t_minCapacity;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>");
		gc_assign(m_elements,m_elements.Resize(t_newCapacity));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>");
		m_modCount+=1;
	}
}
bool c_ArrayList3::p_Add(c_XMLElement* t_o){
	DBG_ENTER("ArrayList.Add")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_o,"o")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>");
	if(m_size+1>m_elements.Length()){
		DBG_BLOCK();
		p_EnsureCapacity(m_size+1);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>");
	gc_assign(m_elements.At(m_size),(t_o));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>");
	m_size+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>");
	m_modCount+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>");
	return true;
}
bool c_ArrayList3::p_Contains2(c_XMLElement* t_o){
	DBG_ENTER("ArrayList.Contains")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_o,"o")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<397>");
	for(int t_i=0;t_i<m_size;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<398>");
		if(m_elements.At(t_i)==(t_o)){
			DBG_BLOCK();
			return true;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<400>");
	return false;
}
bool c_ArrayList3::p_IsEmpty(){
	DBG_ENTER("ArrayList.IsEmpty")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<431>");
	bool t_=m_size==0;
	return t_;
}
void c_ArrayList3::p_RangeCheck(int t_index){
	DBG_ENTER("ArrayList.RangeCheck")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>");
	if(t_index<0 || t_index>=m_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"ArrayList.RangeCheck: Index out of bounds: ",43)+String(t_index)+String(L" is not 0<=index<",17)+String(m_size),0);
	}
}
c_XMLElement* c_ArrayList3::p_RemoveAt(int t_index){
	DBG_ENTER("ArrayList.RemoveAt")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<586>");
	p_RangeCheck(t_index);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<587>");
	c_XMLElement* t_oldValue=dynamic_cast<c_XMLElement*>(m_elements.At(t_index));
	DBG_LOCAL(t_oldValue,"oldValue")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<588>");
	for(int t_i=t_index;t_i<m_size-1;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<589>");
		gc_assign(m_elements.At(t_i),m_elements.At(t_i+1));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<591>");
	m_elements.At(m_size-1)=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<592>");
	m_size-=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<593>");
	m_modCount+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<594>");
	return t_oldValue;
}
c_XMLElement* c_ArrayList3::p_RemoveLast(){
	DBG_ENTER("ArrayList.RemoveLast")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<508>");
	c_XMLElement* t_=p_RemoveAt(m_size-1);
	return t_;
}
bool c_ArrayList3::p_AddLast(c_XMLElement* t_o){
	DBG_ENTER("ArrayList.AddLast")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_o,"o")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<503>");
	bool t_=p_Add(t_o);
	return t_;
}
c_IEnumerator3* c_ArrayList3::p_Enumerator(){
	DBG_ENTER("ArrayList.Enumerator")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>");
	c_IEnumerator3* t_=((new c_ArrayListEnumerator3)->m_new(this));
	return t_;
}
int c_ArrayList3::p_Size(){
	DBG_ENTER("ArrayList.Size")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>");
	return m_size;
}
Array<Object* > c_ArrayList3::p_ToArray(){
	DBG_ENTER("ArrayList.ToArray")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>");
	Array<Object* > t_arr=Array<Object* >(m_size);
	DBG_LOCAL(t_arr,"arr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>");
	for(int t_i=0;t_i<m_size;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>");
		gc_assign(t_arr.At(t_i),m_elements.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>");
	return t_arr;
}
c_XMLElement* c_ArrayList3::p_Get2(int t_index){
	DBG_ENTER("ArrayList.Get")
	c_ArrayList3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>");
	p_RangeCheck(t_index);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>");
	c_XMLElement* t_=dynamic_cast<c_XMLElement*>(m_elements.At(t_index));
	return t_;
}
void c_ArrayList3::mark(){
	c_IList3::mark();
	gc_mark_q(m_elements);
}
String c_ArrayList3::debug(){
	String t="(ArrayList)\n";
	t=c_IList3::debug()+t;
	t+=dbg_decl("elements",&m_elements);
	t+=dbg_decl("size",&m_size);
	return t;
}
String bb_xml_UnescapeXMLString(String t_str){
	DBG_ENTER("UnescapeXMLString")
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<864>");
	if(!((t_str).Length()!=0)){
		DBG_BLOCK();
		return String();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<865>");
	t_str=t_str.Replace(String(L"&quot;",6),String(L"\"",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<866>");
	t_str=t_str.Replace(String(L"&apos;",6),String(L"'",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<867>");
	t_str=t_str.Replace(String(L"&gt;",4),String(L">",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<868>");
	t_str=t_str.Replace(String(L"&lt;",4),String(L"<",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<869>");
	t_str=t_str.Replace(String(L"&amp;",5),String(L"&",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<870>");
	return t_str;
}
c_XMLAttribute::c_XMLAttribute(){
	m_name=String();
	m_value=String();
}
c_XMLAttribute* c_XMLAttribute::m_new(String t_name,String t_value){
	DBG_ENTER("XMLAttribute.new")
	c_XMLAttribute *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<597>");
	this->m_name=t_name;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<598>");
	this->m_value=t_value;
	return this;
}
c_XMLAttribute* c_XMLAttribute::m_new2(){
	DBG_ENTER("XMLAttribute.new")
	c_XMLAttribute *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<590>");
	return this;
}
bool c_XMLAttribute::p_Matches(String t_check){
	DBG_ENTER("XMLAttribute.Matches")
	c_XMLAttribute *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_check,"check")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/xml.monkey<602>");
	bool t_=t_check==m_name+String(L"=",1)+m_value;
	return t_;
}
void c_XMLAttribute::mark(){
	Object::mark();
}
String c_XMLAttribute::debug(){
	String t="(XMLAttribute)\n";
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("value",&m_value);
	return t;
}
c_ICollection4::c_ICollection4(){
}
c_ICollection4* c_ICollection4::m_new(){
	DBG_ENTER("ICollection.new")
	c_ICollection4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>");
	return this;
}
c_IEnumerator4* c_ICollection4::p_ObjectEnumerator(){
	DBG_ENTER("ICollection.ObjectEnumerator")
	c_ICollection4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>");
	c_IEnumerator4* t_=p_Enumerator();
	return t_;
}
void c_ICollection4::mark(){
	Object::mark();
}
String c_ICollection4::debug(){
	String t="(ICollection)\n";
	return t;
}
c_IList4::c_IList4(){
	m_modCount=0;
}
c_IList4* c_IList4::m_new(){
	DBG_ENTER("IList.new")
	c_IList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>");
	c_ICollection4::m_new();
	return this;
}
void c_IList4::p_RangeCheck(int t_index){
	DBG_ENTER("IList.RangeCheck")
	c_IList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>");
	int t_size=this->p_Size();
	DBG_LOCAL(t_size,"size")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>");
	if(t_index<0 || t_index>=t_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"IList.RangeCheck: Index out of bounds: ",39)+String(t_index)+String(L" is not 0<=index<",17)+String(t_size),0);
	}
}
c_IEnumerator4* c_IList4::p_Enumerator(){
	DBG_ENTER("IList.Enumerator")
	c_IList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>");
	c_IEnumerator4* t_=((new c_ListEnumerator4)->m_new(this));
	return t_;
}
void c_IList4::mark(){
	c_ICollection4::mark();
}
String c_IList4::debug(){
	String t="(IList)\n";
	t=c_ICollection4::debug()+t;
	t+=dbg_decl("modCount",&m_modCount);
	return t;
}
c_ArrayList4::c_ArrayList4(){
	m_elements=Array<Object* >();
	m_size=0;
}
c_ArrayList4* c_ArrayList4::m_new(){
	DBG_ENTER("ArrayList.new")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>");
	c_IList4::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>");
	gc_assign(this->m_elements,Array<Object* >(10));
	return this;
}
c_ArrayList4* c_ArrayList4::m_new2(int t_initialCapacity){
	DBG_ENTER("ArrayList.new")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_initialCapacity,"initialCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>");
	c_IList4::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>");
	if(t_initialCapacity<0){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Capacity must be >= 0",36),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>");
	gc_assign(this->m_elements,Array<Object* >(t_initialCapacity));
	return this;
}
c_ArrayList4* c_ArrayList4::m_new3(c_ICollection4* t_c){
	DBG_ENTER("ArrayList.new")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_c,"c")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>");
	c_IList4::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>");
	if(!((t_c)!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Source collection must not be null",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>");
	gc_assign(m_elements,t_c->p_ToArray());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>");
	m_size=m_elements.Length();
	return this;
}
int c_ArrayList4::p_Size(){
	DBG_ENTER("ArrayList.Size")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>");
	return m_size;
}
void c_ArrayList4::p_RangeCheck(int t_index){
	DBG_ENTER("ArrayList.RangeCheck")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>");
	if(t_index<0 || t_index>=m_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"ArrayList.RangeCheck: Index out of bounds: ",43)+String(t_index)+String(L" is not 0<=index<",17)+String(m_size),0);
	}
}
c_XMLAttribute* c_ArrayList4::p_Get2(int t_index){
	DBG_ENTER("ArrayList.Get")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>");
	p_RangeCheck(t_index);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>");
	c_XMLAttribute* t_=dynamic_cast<c_XMLAttribute*>(m_elements.At(t_index));
	return t_;
}
void c_ArrayList4::p_EnsureCapacity(int t_minCapacity){
	DBG_ENTER("ArrayList.EnsureCapacity")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_minCapacity,"minCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>");
	int t_oldCapacity=m_elements.Length();
	DBG_LOCAL(t_oldCapacity,"oldCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>");
	if(t_minCapacity>t_oldCapacity){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>");
		int t_newCapacity=t_oldCapacity*3/2+1;
		DBG_LOCAL(t_newCapacity,"newCapacity")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>");
		if(t_newCapacity<t_minCapacity){
			DBG_BLOCK();
			t_newCapacity=t_minCapacity;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>");
		gc_assign(m_elements,m_elements.Resize(t_newCapacity));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>");
		m_modCount+=1;
	}
}
bool c_ArrayList4::p_Add2(c_XMLAttribute* t_o){
	DBG_ENTER("ArrayList.Add")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_o,"o")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>");
	if(m_size+1>m_elements.Length()){
		DBG_BLOCK();
		p_EnsureCapacity(m_size+1);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>");
	gc_assign(m_elements.At(m_size),(t_o));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>");
	m_size+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>");
	m_modCount+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>");
	return true;
}
c_IEnumerator4* c_ArrayList4::p_Enumerator(){
	DBG_ENTER("ArrayList.Enumerator")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>");
	c_IEnumerator4* t_=((new c_ArrayListEnumerator4)->m_new(this));
	return t_;
}
Array<Object* > c_ArrayList4::p_ToArray(){
	DBG_ENTER("ArrayList.ToArray")
	c_ArrayList4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>");
	Array<Object* > t_arr=Array<Object* >(m_size);
	DBG_LOCAL(t_arr,"arr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>");
	for(int t_i=0;t_i<m_size;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>");
		gc_assign(t_arr.At(t_i),m_elements.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>");
	return t_arr;
}
void c_ArrayList4::mark(){
	c_IList4::mark();
	gc_mark_q(m_elements);
}
String c_ArrayList4::debug(){
	String t="(ArrayList)\n";
	t=c_IList4::debug()+t;
	t+=dbg_decl("elements",&m_elements);
	t+=dbg_decl("size",&m_size);
	return t;
}
c_IEnumerator3::c_IEnumerator3(){
}
c_IEnumerator3* c_IEnumerator3::m_new(){
	DBG_ENTER("IEnumerator.new")
	c_IEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>");
	return this;
}
void c_IEnumerator3::mark(){
	Object::mark();
}
String c_IEnumerator3::debug(){
	String t="(IEnumerator)\n";
	return t;
}
c_IEnumerator4::c_IEnumerator4(){
}
c_IEnumerator4* c_IEnumerator4::m_new(){
	DBG_ENTER("IEnumerator.new")
	c_IEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>");
	return this;
}
void c_IEnumerator4::mark(){
	Object::mark();
}
String c_IEnumerator4::debug(){
	String t="(IEnumerator)\n";
	return t;
}
c_JsonValue::c_JsonValue(){
}
c_JsonValue* c_JsonValue::m_new(){
	DBG_ENTER("JsonValue.new")
	c_JsonValue *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<14>");
	return this;
}
String c_JsonValue::p_StringValue(){
	DBG_ENTER("JsonValue.StringValue")
	c_JsonValue *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<29>");
	bb_json_ThrowError();
	return String();
}
int c_JsonValue::p_IntValue(){
	DBG_ENTER("JsonValue.IntValue")
	c_JsonValue *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<21>");
	bb_json_ThrowError();
	return 0;
}
void c_JsonValue::mark(){
	Object::mark();
}
String c_JsonValue::debug(){
	String t="(JsonValue)\n";
	return t;
}
c_JsonObject::c_JsonObject(){
	m__data=0;
}
c_JsonObject* c_JsonObject::m_new(){
	DBG_ENTER("JsonObject.new")
	c_JsonObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<46>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<47>");
	gc_assign(m__data,(new c_StringMap5)->m_new());
	return this;
}
c_JsonObject* c_JsonObject::m_new2(c_StringMap5* t_data){
	DBG_ENTER("JsonObject.new")
	c_JsonObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<54>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<55>");
	gc_assign(m__data,t_data);
	return this;
}
c_JsonObject* c_JsonObject::m_new3(String t_json){
	DBG_ENTER("JsonObject.new")
	c_JsonObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_json,"json")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<50>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<51>");
	gc_assign(m__data,((new c_JsonParser)->m_new(t_json))->p_ParseObject());
	return this;
}
c_JsonValue* c_JsonObject::p_Get3(String t_key,c_JsonValue* t_defval){
	DBG_ENTER("JsonObject.Get")
	c_JsonObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_defval,"defval")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<83>");
	if(!m__data->p_Contains(t_key)){
		DBG_BLOCK();
		return t_defval;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<84>");
	c_JsonValue* t_val=m__data->p_Get(t_key);
	DBG_LOCAL(t_val,"val")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<85>");
	if((t_val)!=0){
		DBG_BLOCK();
		return t_val;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<86>");
	c_JsonValue* t_=(c_JsonNull::m_Instance());
	return t_;
}
c_StringMap5* c_JsonObject::p_GetData(){
	DBG_ENTER("JsonObject.GetData")
	c_JsonObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<110>");
	return m__data;
}
int c_JsonObject::p_GetInt(String t_key,int t_defval){
	DBG_ENTER("JsonObject.GetInt")
	c_JsonObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_defval,"defval")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<95>");
	if(!m__data->p_Contains(t_key)){
		DBG_BLOCK();
		return t_defval;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<96>");
	int t_=p_Get3(t_key,0)->p_IntValue();
	return t_;
}
void c_JsonObject::mark(){
	c_JsonValue::mark();
	gc_mark_q(m__data);
}
String c_JsonObject::debug(){
	String t="(JsonObject)\n";
	t=c_JsonValue::debug()+t;
	t+=dbg_decl("_data",&m__data);
	return t;
}
c_Map5::c_Map5(){
	m_root=0;
}
c_Map5* c_Map5::m_new(){
	DBG_ENTER("Map.new")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>");
	return this;
}
int c_Map5::p_RotateLeft4(c_Node5* t_node){
	DBG_ENTER("Map.RotateLeft")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>");
	c_Node5* t_child=t_node->m_right;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>");
	gc_assign(t_node->m_right,t_child->m_left);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>");
	if((t_child->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>");
		gc_assign(t_child->m_left->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>");
		if(t_node==t_node->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>");
	gc_assign(t_child->m_left,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map5::p_RotateRight4(c_Node5* t_node){
	DBG_ENTER("Map.RotateRight")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>");
	c_Node5* t_child=t_node->m_left;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>");
	gc_assign(t_node->m_left,t_child->m_right);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>");
	if((t_child->m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>");
		gc_assign(t_child->m_right->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>");
		if(t_node==t_node->m_parent->m_right){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>");
	gc_assign(t_child->m_right,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map5::p_InsertFixup4(c_Node5* t_node){
	DBG_ENTER("Map.InsertFixup")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>");
	while(((t_node->m_parent)!=0) && t_node->m_parent->m_color==-1 && ((t_node->m_parent->m_parent)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>");
		if(t_node->m_parent==t_node->m_parent->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>");
			c_Node5* t_uncle=t_node->m_parent->m_parent->m_right;
			DBG_LOCAL(t_uncle,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>");
			if(((t_uncle)!=0) && t_uncle->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>");
				t_uncle->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>");
				t_uncle->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>");
				t_node=t_uncle->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>");
				if(t_node==t_node->m_parent->m_right){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>");
					p_RotateLeft4(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>");
				p_RotateRight4(t_node->m_parent->m_parent);
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>");
			c_Node5* t_uncle2=t_node->m_parent->m_parent->m_left;
			DBG_LOCAL(t_uncle2,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>");
			if(((t_uncle2)!=0) && t_uncle2->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>");
				t_uncle2->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>");
				t_uncle2->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>");
				t_node=t_uncle2->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>");
				if(t_node==t_node->m_parent->m_left){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>");
					p_RotateRight4(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>");
				p_RotateLeft4(t_node->m_parent->m_parent);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>");
	m_root->m_color=1;
	return 0;
}
bool c_Map5::p_Set4(String t_key,c_JsonValue* t_value){
	DBG_ENTER("Map.Set")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>");
	c_Node5* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>");
	c_Node5* t_parent=0;
	int t_cmp=0;
	DBG_LOCAL(t_parent,"parent")
	DBG_LOCAL(t_cmp,"cmp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>");
		t_parent=t_node;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>");
		t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>");
				gc_assign(t_node->m_value,t_value);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>");
				return false;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>");
	t_node=(new c_Node5)->m_new(t_key,t_value,-1,t_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>");
	if((t_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>");
			gc_assign(t_parent->m_right,t_node);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>");
			gc_assign(t_parent->m_left,t_node);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>");
		p_InsertFixup4(t_node);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>");
		gc_assign(m_root,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>");
	return true;
}
c_Node5* c_Map5::p_FindNode(String t_key){
	DBG_ENTER("Map.FindNode")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>");
	c_Node5* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>");
		int t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_LOCAL(t_cmp,"cmp")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>");
				return t_node;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>");
	return t_node;
}
bool c_Map5::p_Contains(String t_key){
	DBG_ENTER("Map.Contains")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>");
	bool t_=p_FindNode(t_key)!=0;
	return t_;
}
c_JsonValue* c_Map5::p_Get(String t_key){
	DBG_ENTER("Map.Get")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>");
	c_Node5* t_node=p_FindNode(t_key);
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>");
	if((t_node)!=0){
		DBG_BLOCK();
		return t_node->m_value;
	}
	return 0;
}
c_Node5* c_Map5::p_FirstNode(){
	DBG_ENTER("Map.FirstNode")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>");
	if(!((m_root)!=0)){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>");
	c_Node5* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>");
	while((t_node->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>");
		t_node=t_node->m_left;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>");
	return t_node;
}
c_NodeEnumerator* c_Map5::p_ObjectEnumerator(){
	DBG_ENTER("Map.ObjectEnumerator")
	c_Map5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<121>");
	c_NodeEnumerator* t_=(new c_NodeEnumerator)->m_new(p_FirstNode());
	return t_;
}
void c_Map5::mark(){
	Object::mark();
	gc_mark_q(m_root);
}
String c_Map5::debug(){
	String t="(Map)\n";
	t+=dbg_decl("root",&m_root);
	return t;
}
c_StringMap5::c_StringMap5(){
}
c_StringMap5* c_StringMap5::m_new(){
	DBG_ENTER("StringMap.new")
	c_StringMap5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>");
	c_Map5::m_new();
	return this;
}
int c_StringMap5::p_Compare(String t_lhs,String t_rhs){
	DBG_ENTER("StringMap.Compare")
	c_StringMap5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>");
	int t_=t_lhs.Compare(t_rhs);
	return t_;
}
void c_StringMap5::mark(){
	c_Map5::mark();
}
String c_StringMap5::debug(){
	String t="(StringMap)\n";
	t=c_Map5::debug()+t;
	return t;
}
c_JsonParser::c_JsonParser(){
	m__text=String();
	m__pos=0;
	m__toke=String();
	m__type=0;
}
int c_JsonParser::p_GetChar(){
	DBG_ENTER("JsonParser.GetChar")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<345>");
	if(m__pos==m__text.Length()){
		DBG_BLOCK();
		bb_json_ThrowError();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<346>");
	m__pos+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<347>");
	int t_=(int)m__text.At(m__pos-1);
	return t_;
}
bool c_JsonParser::p_CParseDigits(){
	DBG_ENTER("JsonParser.CParseDigits")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<367>");
	int t_p=m__pos;
	DBG_LOCAL(t_p,"p")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<368>");
	while(m__pos<m__text.Length() && (int)m__text.At(m__pos)>=48 && (int)m__text.At(m__pos)<=57){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<369>");
		m__pos+=1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<371>");
	bool t_=m__pos>t_p;
	return t_;
}
bool c_JsonParser::p_CParseChar(int t_chr){
	DBG_ENTER("JsonParser.CParseChar")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_chr,"chr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<361>");
	if(m__pos>=m__text.Length() || (int)m__text.At(m__pos)!=t_chr){
		DBG_BLOCK();
		return false;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<362>");
	m__pos+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<363>");
	return true;
}
int c_JsonParser::p_PeekChar(){
	DBG_ENTER("JsonParser.PeekChar")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<351>");
	if(m__pos==m__text.Length()){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<352>");
	return (int)m__text.At(m__pos);
}
String c_JsonParser::p_Bump(){
	DBG_ENTER("JsonParser.Bump")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<376>");
	while(m__pos<m__text.Length() && (int)m__text.At(m__pos)<=32){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<377>");
		m__pos+=1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<380>");
	if(m__pos==m__text.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<381>");
		m__toke=String();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<382>");
		m__type=0;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<383>");
		return m__toke;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<386>");
	int t_pos=m__pos;
	DBG_LOCAL(t_pos,"pos")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<387>");
	int t_chr=p_GetChar();
	DBG_LOCAL(t_chr,"chr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<389>");
	if(t_chr==34){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<390>");
		do{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<391>");
			int t_chr2=p_GetChar();
			DBG_LOCAL(t_chr2,"chr")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<392>");
			if(t_chr2==34){
				DBG_BLOCK();
				break;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<393>");
			if(t_chr2==92){
				DBG_BLOCK();
				p_GetChar();
			}
		}while(!(false));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<395>");
		m__type=1;
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<396>");
		if(t_chr==45 || t_chr>=48 && t_chr<=57){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<397>");
			if(t_chr==45){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<398>");
				t_chr=p_GetChar();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<399>");
				if(t_chr<48 || t_chr>57){
					DBG_BLOCK();
					bb_json_ThrowError();
				}
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<401>");
			if(t_chr!=48){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<402>");
				p_CParseDigits();
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<404>");
			if(p_CParseChar(46)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<405>");
				p_CParseDigits();
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<407>");
			if(p_CParseChar(69) || p_CParseChar(101)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<408>");
				if(p_PeekChar()==43 || p_PeekChar()==45){
					DBG_BLOCK();
					p_GetChar();
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<409>");
				if(!p_CParseDigits()){
					DBG_BLOCK();
					bb_json_ThrowError();
				}
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<411>");
			m__type=2;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<412>");
			if(t_chr>=65 && t_chr<91 || t_chr>=97 && t_chr<123){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<413>");
				t_chr=p_PeekChar();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<414>");
				while(t_chr>=65 && t_chr<91 || t_chr>=97 && t_chr<123){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<415>");
					p_GetChar();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<416>");
					t_chr=p_PeekChar();
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<418>");
				m__type=4;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<420>");
				m__type=3;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<422>");
	m__toke=m__text.Slice(t_pos,m__pos);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<423>");
	return m__toke;
}
c_JsonParser* c_JsonParser::m_new(String t_json){
	DBG_ENTER("JsonParser.new")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_json,"json")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<316>");
	m__text=t_json;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<317>");
	p_Bump();
	return this;
}
c_JsonParser* c_JsonParser::m_new2(){
	DBG_ENTER("JsonParser.new")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<313>");
	return this;
}
bool c_JsonParser::p_CParse(String t_toke){
	DBG_ENTER("JsonParser.CParse")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_toke,"toke")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<435>");
	if(t_toke!=m__toke){
		DBG_BLOCK();
		return false;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<436>");
	p_Bump();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<437>");
	return true;
}
void c_JsonParser::p_Parse(String t_toke){
	DBG_ENTER("JsonParser.Parse")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_toke,"toke")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<441>");
	if(!p_CParse(t_toke)){
		DBG_BLOCK();
		bb_json_ThrowError();
	}
}
int c_JsonParser::p_TokeType(){
	DBG_ENTER("JsonParser.TokeType")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<431>");
	return m__type;
}
String c_JsonParser::p_Toke(){
	DBG_ENTER("JsonParser.Toke")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<427>");
	return m__toke;
}
String c_JsonParser::p_ParseString2(){
	DBG_ENTER("JsonParser.ParseString")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<471>");
	if(p_TokeType()!=1){
		DBG_BLOCK();
		bb_json_ThrowError();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<472>");
	String t_toke=p_Toke().Slice(1,-1);
	DBG_LOCAL(t_toke,"toke")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<473>");
	int t_i=t_toke.Find(String(L"\\",1),0);
	DBG_LOCAL(t_i,"i")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<474>");
	if(t_i!=-1){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<475>");
		c_StringStack* t_frags=(new c_StringStack)->m_new2();
		int t_p=0;
		String t_esc=String();
		DBG_LOCAL(t_frags,"frags")
		DBG_LOCAL(t_p,"p")
		DBG_LOCAL(t_esc,"esc")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<476>");
		do{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<477>");
			if(t_i+1>=t_toke.Length()){
				DBG_BLOCK();
				bb_json_ThrowError();
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<478>");
			t_frags->p_Push16(t_toke.Slice(t_p,t_i));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<479>");
			int t_1=(int)t_toke.At(t_i+1);
			DBG_LOCAL(t_1,"1")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<480>");
			if(t_1==34){
				DBG_BLOCK();
				t_esc=String(L"\"",1);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<481>");
				if(t_1==92){
					DBG_BLOCK();
					t_esc=String(L"\\",1);
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<482>");
					if(t_1==47){
						DBG_BLOCK();
						t_esc=String(L"/",1);
					}else{
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<483>");
						if(t_1==98){
							DBG_BLOCK();
							t_esc=String((Char)(8),1);
						}else{
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<484>");
							if(t_1==102){
								DBG_BLOCK();
								t_esc=String((Char)(12),1);
							}else{
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<485>");
								if(t_1==114){
									DBG_BLOCK();
									t_esc=String((Char)(13),1);
								}else{
									DBG_BLOCK();
									DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<486>");
									if(t_1==110){
										DBG_BLOCK();
										t_esc=String((Char)(10),1);
									}else{
										DBG_BLOCK();
										DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<487>");
										if(t_1==117){
											DBG_BLOCK();
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<488>");
											if(t_i+6>t_toke.Length()){
												DBG_BLOCK();
												bb_json_ThrowError();
											}
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<489>");
											int t_val=0;
											DBG_LOCAL(t_val,"val")
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<490>");
											for(int t_j=2;t_j<6;t_j=t_j+1){
												DBG_BLOCK();
												DBG_LOCAL(t_j,"j")
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<491>");
												int t_chr=(int)t_toke.At(t_i+t_j);
												DBG_LOCAL(t_chr,"chr")
												DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<492>");
												if(t_chr>=48 && t_chr<58){
													DBG_BLOCK();
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<493>");
													t_val=t_val<<4|t_chr-48;
												}else{
													DBG_BLOCK();
													DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<494>");
													if(t_chr>=65 && t_chr<123){
														DBG_BLOCK();
														DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<495>");
														t_chr&=31;
														DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<496>");
														if(t_chr<1 || t_chr>6){
															DBG_BLOCK();
															bb_json_ThrowError();
														}
														DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<497>");
														t_val=t_val<<4|t_chr+9;
													}else{
														DBG_BLOCK();
														DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<499>");
														bb_json_ThrowError();
													}
												}
											}
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<502>");
											t_esc=String((Char)(t_val),1);
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<503>");
											t_i+=4;
										}else{
											DBG_BLOCK();
											DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<505>");
											bb_json_ThrowError();
										}
									}
								}
							}
						}
					}
				}
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<507>");
			t_frags->p_Push16(t_esc);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<508>");
			t_p=t_i+2;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<509>");
			t_i=t_toke.Find(String(L"\\",1),t_p);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<510>");
			if(t_i!=-1){
				DBG_BLOCK();
				continue;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<511>");
			t_frags->p_Push16(t_toke.Slice(t_p));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<512>");
			break;
		}while(!(false));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<514>");
		t_toke=t_frags->p_Join(String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<516>");
	p_Bump();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<517>");
	return t_toke;
}
String c_JsonParser::p_ParseNumber(){
	DBG_ENTER("JsonParser.ParseNumber")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<521>");
	if(p_TokeType()!=2){
		DBG_BLOCK();
		bb_json_ThrowError();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<522>");
	String t_toke=p_Toke();
	DBG_LOCAL(t_toke,"toke")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<523>");
	p_Bump();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<524>");
	return t_toke;
}
Array<c_JsonValue* > c_JsonParser::p_ParseArray(){
	DBG_ENTER("JsonParser.ParseArray")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<459>");
	p_Parse(String(L"[",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<460>");
	if(p_CParse(String(L"]",1))){
		DBG_BLOCK();
		return Array<c_JsonValue* >();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<461>");
	c_Stack7* t_stack=(new c_Stack7)->m_new();
	DBG_LOCAL(t_stack,"stack")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<462>");
	do{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<463>");
		c_JsonValue* t_value=p_ParseValue();
		DBG_LOCAL(t_value,"value")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<464>");
		t_stack->p_Push19(t_value);
	}while(!(!p_CParse(String(L",",1))));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<466>");
	p_Parse(String(L"]",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<467>");
	Array<c_JsonValue* > t_=t_stack->p_ToArray();
	return t_;
}
c_JsonValue* c_JsonParser::p_ParseValue(){
	DBG_ENTER("JsonParser.ParseValue")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<321>");
	if(p_TokeType()==1){
		DBG_BLOCK();
		c_JsonValue* t_=(c_JsonString::m_Instance(p_ParseString2()));
		return t_;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<322>");
	if(p_TokeType()==2){
		DBG_BLOCK();
		c_JsonValue* t_2=(c_JsonNumber::m_Instance(p_ParseNumber()));
		return t_2;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<323>");
	if(p_Toke()==String(L"{",1)){
		DBG_BLOCK();
		c_JsonValue* t_3=((new c_JsonObject)->m_new2(p_ParseObject()));
		return t_3;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<324>");
	if(p_Toke()==String(L"[",1)){
		DBG_BLOCK();
		c_JsonValue* t_4=((new c_JsonArray)->m_new2(p_ParseArray()));
		return t_4;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<325>");
	if(p_CParse(String(L"true",4))){
		DBG_BLOCK();
		c_JsonValue* t_5=(c_JsonBool::m_Instance(true));
		return t_5;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<326>");
	if(p_CParse(String(L"false",5))){
		DBG_BLOCK();
		c_JsonValue* t_6=(c_JsonBool::m_Instance(false));
		return t_6;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<327>");
	if(p_CParse(String(L"null",4))){
		DBG_BLOCK();
		c_JsonValue* t_7=(c_JsonNull::m_Instance());
		return t_7;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<328>");
	bb_json_ThrowError();
	return 0;
}
c_StringMap5* c_JsonParser::p_ParseObject(){
	DBG_ENTER("JsonParser.ParseObject")
	c_JsonParser *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<445>");
	p_Parse(String(L"{",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<446>");
	c_StringMap5* t_map=(new c_StringMap5)->m_new();
	DBG_LOCAL(t_map,"map")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<447>");
	if(p_CParse(String(L"}",1))){
		DBG_BLOCK();
		return t_map;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<448>");
	do{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<449>");
		String t_name=p_ParseString2();
		DBG_LOCAL(t_name,"name")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<450>");
		p_Parse(String(L":",1));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<451>");
		c_JsonValue* t_value=p_ParseValue();
		DBG_LOCAL(t_value,"value")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<452>");
		t_map->p_Set4(t_name,t_value);
	}while(!(!p_CParse(String(L",",1))));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<454>");
	p_Parse(String(L"}",1));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<455>");
	return t_map;
}
void c_JsonParser::mark(){
	Object::mark();
}
String c_JsonParser::debug(){
	String t="(JsonParser)\n";
	t+=dbg_decl("_text",&m__text);
	t+=dbg_decl("_toke",&m__toke);
	t+=dbg_decl("_type",&m__type);
	t+=dbg_decl("_pos",&m__pos);
	return t;
}
c_JsonError::c_JsonError(){
}
c_JsonError* c_JsonError::m_new(){
	DBG_ENTER("JsonError.new")
	c_JsonError *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<11>");
	return this;
}
void c_JsonError::mark(){
	ThrowableObject::mark();
}
String c_JsonError::debug(){
	String t="(JsonError)\n";
	return t;
}
void bb_json_ThrowError(){
	DBG_ENTER("ThrowError")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<6>");
	throw (new c_JsonError)->m_new();
}
c_Stack6::c_Stack6(){
	m_data=Array<String >();
	m_length=0;
}
c_Stack6* c_Stack6::m_new(){
	DBG_ENTER("Stack.new")
	c_Stack6 *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Stack6* c_Stack6::m_new2(Array<String > t_data){
	DBG_ENTER("Stack.new")
	c_Stack6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>");
	gc_assign(this->m_data,t_data.Slice(0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>");
	this->m_length=t_data.Length();
	return this;
}
void c_Stack6::p_Push16(String t_value){
	DBG_ENTER("Stack.Push")
	c_Stack6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>");
	if(m_length==m_data.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>");
		gc_assign(m_data,m_data.Resize(m_length*2+10));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>");
	m_data.At(m_length)=t_value;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>");
	m_length+=1;
}
void c_Stack6::p_Push17(Array<String > t_values,int t_offset,int t_count){
	DBG_ENTER("Stack.Push")
	c_Stack6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_LOCAL(t_count,"count")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>");
	for(int t_i=0;t_i<t_count;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>");
		p_Push16(t_values.At(t_offset+t_i));
	}
}
void c_Stack6::p_Push18(Array<String > t_values,int t_offset){
	DBG_ENTER("Stack.Push")
	c_Stack6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>");
	p_Push17(t_values,t_offset,t_values.Length()-t_offset);
}
Array<String > c_Stack6::p_ToArray(){
	DBG_ENTER("Stack.ToArray")
	c_Stack6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>");
	Array<String > t_t=Array<String >(m_length);
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>");
	for(int t_i=0;t_i<m_length;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>");
		t_t.At(t_i)=m_data.At(t_i);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>");
	return t_t;
}
void c_Stack6::mark(){
	Object::mark();
	gc_mark_q(m_data);
}
String c_Stack6::debug(){
	String t="(Stack)\n";
	t+=dbg_decl("data",&m_data);
	t+=dbg_decl("length",&m_length);
	return t;
}
c_StringStack::c_StringStack(){
}
c_StringStack* c_StringStack::m_new(Array<String > t_data){
	DBG_ENTER("StringStack.new")
	c_StringStack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<351>");
	c_Stack6::m_new2(t_data);
	return this;
}
c_StringStack* c_StringStack::m_new2(){
	DBG_ENTER("StringStack.new")
	c_StringStack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<348>");
	c_Stack6::m_new();
	return this;
}
String c_StringStack::p_Join(String t_separator){
	DBG_ENTER("StringStack.Join")
	c_StringStack *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_separator,"separator")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<355>");
	String t_=t_separator.Join(p_ToArray());
	return t_;
}
void c_StringStack::mark(){
	c_Stack6::mark();
}
String c_StringStack::debug(){
	String t="(StringStack)\n";
	t=c_Stack6::debug()+t;
	return t;
}
c_JsonString::c_JsonString(){
	m__value=String();
}
c_JsonString* c_JsonString::m_new(String t_value){
	DBG_ENTER("JsonString.new")
	c_JsonString *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<257>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<258>");
	m__value=t_value;
	return this;
}
c_JsonString* c_JsonString::m_new2(){
	DBG_ENTER("JsonString.new")
	c_JsonString *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<255>");
	c_JsonValue::m_new();
	return this;
}
c_JsonString* c_JsonString::m__null;
c_JsonString* c_JsonString::m_Instance(String t_value){
	DBG_ENTER("JsonString.Instance")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<270>");
	if((t_value).Length()!=0){
		DBG_BLOCK();
		c_JsonString* t_=(new c_JsonString)->m_new(t_value);
		return t_;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<271>");
	return m__null;
}
String c_JsonString::p_StringValue(){
	DBG_ENTER("JsonString.StringValue")
	c_JsonString *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<262>");
	return m__value;
}
void c_JsonString::mark(){
	c_JsonValue::mark();
}
String c_JsonString::debug(){
	String t="(JsonString)\n";
	t=c_JsonValue::debug()+t;
	t+=dbg_decl("_value",&m__value);
	t+=dbg_decl("_null",&c_JsonString::m__null);
	return t;
}
c_JsonNumber::c_JsonNumber(){
	m__value=String();
}
c_JsonNumber* c_JsonNumber::m_new(String t_value){
	DBG_ENTER("JsonNumber.new")
	c_JsonNumber *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<284>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<286>");
	m__value=t_value;
	return this;
}
c_JsonNumber* c_JsonNumber::m_new2(){
	DBG_ENTER("JsonNumber.new")
	c_JsonNumber *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<282>");
	c_JsonValue::m_new();
	return this;
}
c_JsonNumber* c_JsonNumber::m__zero;
c_JsonNumber* c_JsonNumber::m_Instance(String t_value){
	DBG_ENTER("JsonNumber.Instance")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<302>");
	if(t_value!=String(L"0",1)){
		DBG_BLOCK();
		c_JsonNumber* t_=(new c_JsonNumber)->m_new(t_value);
		return t_;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<303>");
	return m__zero;
}
int c_JsonNumber::p_IntValue(){
	DBG_ENTER("JsonNumber.IntValue")
	c_JsonNumber *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<290>");
	int t_=(m__value).ToInt();
	return t_;
}
void c_JsonNumber::mark(){
	c_JsonValue::mark();
}
String c_JsonNumber::debug(){
	String t="(JsonNumber)\n";
	t=c_JsonValue::debug()+t;
	t+=dbg_decl("_value",&m__value);
	t+=dbg_decl("_zero",&c_JsonNumber::m__zero);
	return t;
}
c_JsonArray::c_JsonArray(){
	m__data=Array<c_JsonValue* >();
}
c_JsonArray* c_JsonArray::m_new(int t_length){
	DBG_ENTER("JsonArray.new")
	c_JsonArray *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_length,"length")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<133>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<134>");
	gc_assign(m__data,Array<c_JsonValue* >(t_length));
	return this;
}
c_JsonArray* c_JsonArray::m_new2(Array<c_JsonValue* > t_data){
	DBG_ENTER("JsonArray.new")
	c_JsonArray *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<137>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<138>");
	gc_assign(m__data,t_data);
	return this;
}
c_JsonArray* c_JsonArray::m_new3(){
	DBG_ENTER("JsonArray.new")
	c_JsonArray *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<131>");
	c_JsonValue::m_new();
	return this;
}
void c_JsonArray::mark(){
	c_JsonValue::mark();
	gc_mark_q(m__data);
}
String c_JsonArray::debug(){
	String t="(JsonArray)\n";
	t=c_JsonValue::debug()+t;
	t+=dbg_decl("_data",&m__data);
	return t;
}
c_Stack7::c_Stack7(){
	m_data=Array<c_JsonValue* >();
	m_length=0;
}
c_Stack7* c_Stack7::m_new(){
	DBG_ENTER("Stack.new")
	c_Stack7 *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Stack7* c_Stack7::m_new2(Array<c_JsonValue* > t_data){
	DBG_ENTER("Stack.new")
	c_Stack7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<13>");
	gc_assign(this->m_data,t_data.Slice(0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<14>");
	this->m_length=t_data.Length();
	return this;
}
void c_Stack7::p_Push19(c_JsonValue* t_value){
	DBG_ENTER("Stack.Push")
	c_Stack7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<67>");
	if(m_length==m_data.Length()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<68>");
		gc_assign(m_data,m_data.Resize(m_length*2+10));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<70>");
	gc_assign(m_data.At(m_length),t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<71>");
	m_length+=1;
}
void c_Stack7::p_Push20(Array<c_JsonValue* > t_values,int t_offset,int t_count){
	DBG_ENTER("Stack.Push")
	c_Stack7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_LOCAL(t_count,"count")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<79>");
	for(int t_i=0;t_i<t_count;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<80>");
		p_Push19(t_values.At(t_offset+t_i));
	}
}
void c_Stack7::p_Push21(Array<c_JsonValue* > t_values,int t_offset){
	DBG_ENTER("Stack.Push")
	c_Stack7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_values,"values")
	DBG_LOCAL(t_offset,"offset")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<75>");
	p_Push20(t_values,t_offset,t_values.Length()-t_offset);
}
Array<c_JsonValue* > c_Stack7::p_ToArray(){
	DBG_ENTER("Stack.ToArray")
	c_Stack7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<18>");
	Array<c_JsonValue* > t_t=Array<c_JsonValue* >(m_length);
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<19>");
	for(int t_i=0;t_i<m_length;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<20>");
		gc_assign(t_t.At(t_i),m_data.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/stack.monkey<22>");
	return t_t;
}
void c_Stack7::mark(){
	Object::mark();
	gc_mark_q(m_data);
}
String c_Stack7::debug(){
	String t="(Stack)\n";
	t+=dbg_decl("data",&m_data);
	t+=dbg_decl("length",&m_length);
	return t;
}
c_JsonBool::c_JsonBool(){
	m__value=false;
}
c_JsonBool* c_JsonBool::m_new(bool t_value){
	DBG_ENTER("JsonBool.new")
	c_JsonBool *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<228>");
	c_JsonValue::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<229>");
	m__value=t_value;
	return this;
}
c_JsonBool* c_JsonBool::m_new2(){
	DBG_ENTER("JsonBool.new")
	c_JsonBool *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<226>");
	c_JsonValue::m_new();
	return this;
}
c_JsonBool* c_JsonBool::m__true;
c_JsonBool* c_JsonBool::m__false;
c_JsonBool* c_JsonBool::m_Instance(bool t_value){
	DBG_ENTER("JsonBool.Instance")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<242>");
	if(t_value){
		DBG_BLOCK();
		return m__true;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<243>");
	return m__false;
}
void c_JsonBool::mark(){
	c_JsonValue::mark();
}
String c_JsonBool::debug(){
	String t="(JsonBool)\n";
	t=c_JsonValue::debug()+t;
	t+=dbg_decl("_value",&m__value);
	t+=dbg_decl("_true",&c_JsonBool::m__true);
	t+=dbg_decl("_false",&c_JsonBool::m__false);
	return t;
}
c_JsonNull::c_JsonNull(){
}
c_JsonNull* c_JsonNull::m_new(){
	DBG_ENTER("JsonNull.new")
	c_JsonNull *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<210>");
	c_JsonValue::m_new();
	return this;
}
c_JsonNull* c_JsonNull::m__instance;
c_JsonNull* c_JsonNull::m_Instance(){
	DBG_ENTER("JsonNull.Instance")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/brl/json.monkey<217>");
	return m__instance;
}
void c_JsonNull::mark(){
	c_JsonValue::mark();
}
String c_JsonNull::debug(){
	String t="(JsonNull)\n";
	t=c_JsonValue::debug()+t;
	t+=dbg_decl("_instance",&c_JsonNull::m__instance);
	return t;
}
c_Node5::c_Node5(){
	m_key=String();
	m_right=0;
	m_left=0;
	m_value=0;
	m_color=0;
	m_parent=0;
}
c_Node5* c_Node5::m_new(String t_key,c_JsonValue* t_value,int t_color,c_Node5* t_parent){
	DBG_ENTER("Node.new")
	c_Node5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_LOCAL(t_color,"color")
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>");
	this->m_key=t_key;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>");
	gc_assign(this->m_value,t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>");
	this->m_color=t_color;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>");
	gc_assign(this->m_parent,t_parent);
	return this;
}
c_Node5* c_Node5::m_new2(){
	DBG_ENTER("Node.new")
	c_Node5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>");
	return this;
}
c_Node5* c_Node5::p_NextNode(){
	DBG_ENTER("Node.NextNode")
	c_Node5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>");
	c_Node5* t_node=0;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>");
	if((m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>");
		t_node=m_right;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>");
		while((t_node->m_left)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>");
			t_node=t_node->m_left;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>");
		return t_node;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>");
	t_node=this;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>");
	c_Node5* t_parent=this->m_parent;
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>");
	while(((t_parent)!=0) && t_node==t_parent->m_right){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>");
		t_node=t_parent;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>");
		t_parent=t_parent->m_parent;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>");
	return t_parent;
}
String c_Node5::p_Key(){
	DBG_ENTER("Node.Key")
	c_Node5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<377>");
	return m_key;
}
c_JsonValue* c_Node5::p_Value(){
	DBG_ENTER("Node.Value")
	c_Node5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<381>");
	return m_value;
}
void c_Node5::mark(){
	Object::mark();
	gc_mark_q(m_right);
	gc_mark_q(m_left);
	gc_mark_q(m_value);
	gc_mark_q(m_parent);
}
String c_Node5::debug(){
	String t="(Node)\n";
	t+=dbg_decl("key",&m_key);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("color",&m_color);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("left",&m_left);
	t+=dbg_decl("right",&m_right);
	return t;
}
c_NodeEnumerator::c_NodeEnumerator(){
	m_node=0;
}
c_NodeEnumerator* c_NodeEnumerator::m_new(c_Node5* t_node){
	DBG_ENTER("NodeEnumerator.new")
	c_NodeEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<437>");
	gc_assign(this->m_node,t_node);
	return this;
}
c_NodeEnumerator* c_NodeEnumerator::m_new2(){
	DBG_ENTER("NodeEnumerator.new")
	c_NodeEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<434>");
	return this;
}
bool c_NodeEnumerator::p_HasNext(){
	DBG_ENTER("NodeEnumerator.HasNext")
	c_NodeEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<441>");
	bool t_=m_node!=0;
	return t_;
}
c_Node5* c_NodeEnumerator::p_NextObject(){
	DBG_ENTER("NodeEnumerator.NextObject")
	c_NodeEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<445>");
	c_Node5* t_t=m_node;
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<446>");
	gc_assign(m_node,m_node->p_NextNode());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<447>");
	return t_t;
}
void c_NodeEnumerator::mark(){
	Object::mark();
	gc_mark_q(m_node);
}
String c_NodeEnumerator::debug(){
	String t="(NodeEnumerator)\n";
	t+=dbg_decl("node",&m_node);
	return t;
}
c_TitleScreen::c_TitleScreen(){
}
c_TitleScreen* c_TitleScreen::m_new(){
	DBG_ENTER("TitleScreen.new")
	c_TitleScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<32>");
	c_Screen::m_new(String());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<33>");
	m_name=String(L"Title",5);
	return this;
}
void c_TitleScreen::p_Start(){
	DBG_ENTER("TitleScreen.Start")
	c_TitleScreen *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TitleScreen::p_Render(){
	DBG_ENTER("TitleScreen.Render")
	c_TitleScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<41>");
	bb_graphics_Cls(FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<42>");
	bb_graphics_DrawText(String(L"Bunny Shooter!",14),bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2,FLOAT(0.5),FLOAT(0.5));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<43>");
	bb_graphics_DrawText(String(L"Escape to Quit!",15),bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2+FLOAT(40.0),FLOAT(0.5),FLOAT(0.5));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<44>");
	bb_graphics_DrawText(String(L"Enter to Play!",14),bb_framework_SCREEN_WIDTH2,bb_framework_SCREEN_HEIGHT2+FLOAT(80.0),FLOAT(0.5),FLOAT(0.5));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<45>");
	c_FPSCounter::m_Draw(0,0,FLOAT(0.0),FLOAT(0.0));
}
void c_TitleScreen::p_Update2(){
	DBG_ENTER("TitleScreen.Update")
	c_TitleScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<49>");
	if((bb_input_KeyHit(27))!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<50>");
		p_FadeToScreen(0,bb_framework_defaultFadeTime,false,false,true);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<52>");
	if((bb_input_KeyHit(13))!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<53>");
		p_FadeToScreen((bb_mainClass_gameScreen),bb_framework_defaultFadeTime,false,false,true);
	}
}
void c_TitleScreen::mark(){
	c_Screen::mark();
}
String c_TitleScreen::debug(){
	String t="(TitleScreen)\n";
	t=c_Screen::debug()+t;
	return t;
}
c_TitleScreen* bb_mainClass_titleScreen;
c_GameScreen::c_GameScreen(){
	m_tilemap=0;
	m_bunny=0;
	m_currentTime=0;
	m_score=0;
	m_gameOver=false;
}
c_GameScreen* c_GameScreen::m_new(){
	DBG_ENTER("GameScreen.new")
	c_GameScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<68>");
	c_Screen::m_new(String());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<69>");
	m_name=String(L"Gameplay",8);
	return this;
}
void c_GameScreen::p_Start(){
	DBG_ENTER("GameScreen.Start")
	c_GameScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<75>");
	c_MyTiledTileMapReader* t_reader=(new c_MyTiledTileMapReader)->m_new();
	DBG_LOCAL(t_reader,"reader")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<76>");
	c_TileMap* t_tm=t_reader->p_LoadMap(String(L"levels/map.tmx",14));
	DBG_LOCAL(t_tm,"tm")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<77>");
	gc_assign(m_tilemap,dynamic_cast<c_MyTileMap*>(t_tm));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<79>");
	gc_assign(m_bunny,(new c_Bunny)->m_new(bb_framework_diddyGame->m_images->p_Find(String(L"bunny_bottom",12)),bb_framework_SCREEN_HEIGHT2,bb_framework_SCREEN_WIDTH2,10));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<80>");
	m_currentTime=bb_app_Millisecs();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<81>");
	m_score=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<82>");
	m_gameOver=false;
}
void c_GameScreen::p_Update2(){
	DBG_ENTER("GameScreen.Update")
	c_GameScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<86>");
	if(m_gameOver){
		DBG_BLOCK();
		return;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<87>");
	m_bunny->p_Update2();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<88>");
	bb_bulletClass_UpdateBullets();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<89>");
	if(bb_app_Millisecs()-m_currentTime>1000){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<90>");
		bb_hunterClass_CreateHunter();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<91>");
		m_currentTime=bb_app_Millisecs();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<101>");
	bb_hunterClass_UpdateHunter(Float(m_bunny->p_GetXpos()),Float(m_bunny->p_GetYpos()));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<103>");
	if(m_bunny->p_GetHealth()<=0 && m_gameOver==false){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<104>");
		m_gameOver=true;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<105>");
		p_FadeToScreen((bb_mainClass_titleScreen),bb_framework_defaultFadeTime,false,false,true);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<106>");
		bb_bulletClass_RemoveBullets();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<107>");
		bb_hunterClass_RemoveHunter();
	}
}
void c_GameScreen::p_Render(){
	DBG_ENTER("GameScreen.Render")
	c_GameScreen *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<112>");
	bb_graphics_Cls(FLOAT(0.0),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<113>");
	m_tilemap->p_RenderMap(int(bb_framework_diddyGame->m_scrollX),int(bb_framework_diddyGame->m_scrollY),int(bb_framework_SCREEN_WIDTH),int(bb_framework_SCREEN_HEIGHT),FLOAT(1.0),FLOAT(1.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<114>");
	m_bunny->p_Draw();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<120>");
	bb_hunterClass_RenderHunter();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<121>");
	bb_bulletClass_RenderBullets();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<122>");
	bb_graphics_SetColor(FLOAT(0.0),FLOAT(0.0),FLOAT(255.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<123>");
	bb_graphics_DrawText(String(L"Score : ",8)+String(m_score),FLOAT(10.0),FLOAT(10.0),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/mainClass.monkey<124>");
	if(bb_mainClass_Debug){
		DBG_BLOCK();
	}
}
void c_GameScreen::mark(){
	c_Screen::mark();
	gc_mark_q(m_tilemap);
	gc_mark_q(m_bunny);
}
String c_GameScreen::debug(){
	String t="(GameScreen)\n";
	t=c_Screen::debug()+t;
	t+=dbg_decl("bunny",&m_bunny);
	t+=dbg_decl("currentTime",&m_currentTime);
	t+=dbg_decl("score",&m_score);
	t+=dbg_decl("gameOver",&m_gameOver);
	t+=dbg_decl("tilemap",&m_tilemap);
	return t;
}
c_GameScreen* bb_mainClass_gameScreen;
void bb_functions_ExitApp(){
	DBG_ENTER("ExitApp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<86>");
	bb_app_EndApp();
}
int bb_graphics_DrawImageRect(c_Image* t_image,Float t_x,Float t_y,int t_srcX,int t_srcY,int t_srcWidth,int t_srcHeight,int t_frame){
	DBG_ENTER("DrawImageRect")
	DBG_LOCAL(t_image,"image")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_srcX,"srcX")
	DBG_LOCAL(t_srcY,"srcY")
	DBG_LOCAL(t_srcWidth,"srcWidth")
	DBG_LOCAL(t_srcHeight,"srcHeight")
	DBG_LOCAL(t_frame,"frame")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<495>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<496>");
	if(t_frame<0 || t_frame>=t_image->m_frames.Length()){
		DBG_BLOCK();
		bbError(String(L"Invalid image frame",19));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<497>");
	if(t_srcX<0 || t_srcY<0 || t_srcX+t_srcWidth>t_image->m_width || t_srcY+t_srcHeight>t_image->m_height){
		DBG_BLOCK();
		bbError(String(L"Invalid image rectangle",23));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<500>");
	c_Frame* t_f=t_image->m_frames.At(t_frame);
	DBG_LOCAL(t_f,"f")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<502>");
	bb_graphics_context->p_Validate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<504>");
	bb_graphics_renderDevice->DrawSurface2(t_image->m_surface,-t_image->m_tx+t_x,-t_image->m_ty+t_y,t_srcX+t_f->m_x,t_srcY+t_f->m_y,t_srcWidth,t_srcHeight);
	return 0;
}
int bb_graphics_DrawImageRect2(c_Image* t_image,Float t_x,Float t_y,int t_srcX,int t_srcY,int t_srcWidth,int t_srcHeight,Float t_rotation,Float t_scaleX,Float t_scaleY,int t_frame){
	DBG_ENTER("DrawImageRect")
	DBG_LOCAL(t_image,"image")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_srcX,"srcX")
	DBG_LOCAL(t_srcY,"srcY")
	DBG_LOCAL(t_srcWidth,"srcWidth")
	DBG_LOCAL(t_srcHeight,"srcHeight")
	DBG_LOCAL(t_rotation,"rotation")
	DBG_LOCAL(t_scaleX,"scaleX")
	DBG_LOCAL(t_scaleY,"scaleY")
	DBG_LOCAL(t_frame,"frame")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<510>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<511>");
	if(t_frame<0 || t_frame>=t_image->m_frames.Length()){
		DBG_BLOCK();
		bbError(String(L"Invalid image frame",19));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<512>");
	if(t_srcX<0 || t_srcY<0 || t_srcX+t_srcWidth>t_image->m_width || t_srcY+t_srcHeight>t_image->m_height){
		DBG_BLOCK();
		bbError(String(L"Invalid image rectangle",23));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<515>");
	c_Frame* t_f=t_image->m_frames.At(t_frame);
	DBG_LOCAL(t_f,"f")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<517>");
	bb_graphics_PushMatrix();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<519>");
	bb_graphics_Translate(t_x,t_y);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<520>");
	bb_graphics_Rotate(t_rotation);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<521>");
	bb_graphics_Scale(t_scaleX,t_scaleY);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<522>");
	bb_graphics_Translate(-t_image->m_tx,-t_image->m_ty);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<524>");
	bb_graphics_context->p_Validate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<526>");
	bb_graphics_renderDevice->DrawSurface2(t_image->m_surface,FLOAT(0.0),FLOAT(0.0),t_srcX+t_f->m_x,t_srcY+t_f->m_y,t_srcWidth,t_srcHeight);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<528>");
	bb_graphics_PopMatrix();
	return 0;
}
c_ListEnumerator::c_ListEnumerator(){
	m_lst=0;
	m_expectedModCount=0;
	m_index=0;
	m_lastIndex=0;
}
c_ListEnumerator* c_ListEnumerator::m_new(c_IList* t_lst){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>");
	c_IEnumerator::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>");
	gc_assign(this->m_lst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>");
	m_expectedModCount=t_lst->m_modCount;
	return this;
}
c_ListEnumerator* c_ListEnumerator::m_new2(){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>");
	c_IEnumerator::m_new();
	return this;
}
void c_ListEnumerator::p_CheckConcurrency(){
	DBG_ENTER("ListEnumerator.CheckConcurrency")
	c_ListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>");
	if(m_lst->m_modCount!=m_expectedModCount){
		DBG_BLOCK();
		throw (new c_ConcurrentModificationException)->m_new(String(L"ListEnumerator.CheckConcurrency: Concurrent list modification",61),0);
	}
}
bool c_ListEnumerator::p_HasNext(){
	DBG_ENTER("ListEnumerator.HasNext")
	c_ListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>");
	bool t_=m_index<m_lst->p_Size();
	return t_;
}
c_DiddyDataLayer* c_ListEnumerator::p_NextObject(){
	DBG_ENTER("ListEnumerator.NextObject")
	c_ListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>");
	c_DiddyDataLayer* t_=m_lst->p_Get2(m_lastIndex);
	return t_;
}
void c_ListEnumerator::mark(){
	c_IEnumerator::mark();
	gc_mark_q(m_lst);
}
String c_ListEnumerator::debug(){
	String t="(ListEnumerator)\n";
	t=c_IEnumerator::debug()+t;
	t+=dbg_decl("lst",&m_lst);
	t+=dbg_decl("lastIndex",&m_lastIndex);
	t+=dbg_decl("index",&m_index);
	t+=dbg_decl("expectedModCount",&m_expectedModCount);
	return t;
}
c_ArrayListEnumerator::c_ArrayListEnumerator(){
	m_alst=0;
}
c_ArrayListEnumerator* c_ArrayListEnumerator::m_new(c_ArrayList* t_lst){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>");
	c_ListEnumerator::m_new(t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>");
	gc_assign(this->m_alst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>");
	m_expectedModCount=m_alst->m_modCount;
	return this;
}
c_ArrayListEnumerator* c_ArrayListEnumerator::m_new2(){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>");
	c_ListEnumerator::m_new2();
	return this;
}
bool c_ArrayListEnumerator::p_HasNext(){
	DBG_ENTER("ArrayListEnumerator.HasNext")
	c_ArrayListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>");
	bool t_=m_index<m_alst->m_size;
	return t_;
}
c_DiddyDataLayer* c_ArrayListEnumerator::p_NextObject(){
	DBG_ENTER("ArrayListEnumerator.NextObject")
	c_ArrayListEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>");
	c_DiddyDataLayer* t_=dynamic_cast<c_DiddyDataLayer*>(m_alst->m_elements.At(m_lastIndex));
	return t_;
}
void c_ArrayListEnumerator::mark(){
	c_ListEnumerator::mark();
	gc_mark_q(m_alst);
}
String c_ArrayListEnumerator::debug(){
	String t="(ArrayListEnumerator)\n";
	t=c_ListEnumerator::debug()+t;
	t+=dbg_decl("alst",&m_alst);
	return t;
}
c_ListEnumerator2::c_ListEnumerator2(){
	m_lst=0;
	m_expectedModCount=0;
	m_index=0;
	m_lastIndex=0;
}
c_ListEnumerator2* c_ListEnumerator2::m_new(c_IList2* t_lst){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>");
	c_IEnumerator2::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>");
	gc_assign(this->m_lst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>");
	m_expectedModCount=t_lst->m_modCount;
	return this;
}
c_ListEnumerator2* c_ListEnumerator2::m_new2(){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>");
	c_IEnumerator2::m_new();
	return this;
}
void c_ListEnumerator2::p_CheckConcurrency(){
	DBG_ENTER("ListEnumerator.CheckConcurrency")
	c_ListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>");
	if(m_lst->m_modCount!=m_expectedModCount){
		DBG_BLOCK();
		throw (new c_ConcurrentModificationException)->m_new(String(L"ListEnumerator.CheckConcurrency: Concurrent list modification",61),0);
	}
}
bool c_ListEnumerator2::p_HasNext(){
	DBG_ENTER("ListEnumerator.HasNext")
	c_ListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>");
	bool t_=m_index<m_lst->p_Size();
	return t_;
}
c_DiddyDataObject* c_ListEnumerator2::p_NextObject(){
	DBG_ENTER("ListEnumerator.NextObject")
	c_ListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>");
	c_DiddyDataObject* t_=m_lst->p_Get2(m_lastIndex);
	return t_;
}
void c_ListEnumerator2::mark(){
	c_IEnumerator2::mark();
	gc_mark_q(m_lst);
}
String c_ListEnumerator2::debug(){
	String t="(ListEnumerator)\n";
	t=c_IEnumerator2::debug()+t;
	t+=dbg_decl("lst",&m_lst);
	t+=dbg_decl("lastIndex",&m_lastIndex);
	t+=dbg_decl("index",&m_index);
	t+=dbg_decl("expectedModCount",&m_expectedModCount);
	return t;
}
c_ArrayListEnumerator2::c_ArrayListEnumerator2(){
	m_alst=0;
}
c_ArrayListEnumerator2* c_ArrayListEnumerator2::m_new(c_ArrayList2* t_lst){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>");
	c_ListEnumerator2::m_new(t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>");
	gc_assign(this->m_alst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>");
	m_expectedModCount=m_alst->m_modCount;
	return this;
}
c_ArrayListEnumerator2* c_ArrayListEnumerator2::m_new2(){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>");
	c_ListEnumerator2::m_new2();
	return this;
}
bool c_ArrayListEnumerator2::p_HasNext(){
	DBG_ENTER("ArrayListEnumerator.HasNext")
	c_ArrayListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>");
	bool t_=m_index<m_alst->m_size;
	return t_;
}
c_DiddyDataObject* c_ArrayListEnumerator2::p_NextObject(){
	DBG_ENTER("ArrayListEnumerator.NextObject")
	c_ArrayListEnumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>");
	c_DiddyDataObject* t_=dynamic_cast<c_DiddyDataObject*>(m_alst->m_elements.At(m_lastIndex));
	return t_;
}
void c_ArrayListEnumerator2::mark(){
	c_ListEnumerator2::mark();
	gc_mark_q(m_alst);
}
String c_ArrayListEnumerator2::debug(){
	String t="(ArrayListEnumerator)\n";
	t=c_ListEnumerator2::debug()+t;
	t+=dbg_decl("alst",&m_alst);
	return t;
}
c_ListEnumerator3::c_ListEnumerator3(){
	m_lst=0;
	m_expectedModCount=0;
	m_index=0;
	m_lastIndex=0;
}
c_ListEnumerator3* c_ListEnumerator3::m_new(c_IList3* t_lst){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>");
	c_IEnumerator3::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>");
	gc_assign(this->m_lst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>");
	m_expectedModCount=t_lst->m_modCount;
	return this;
}
c_ListEnumerator3* c_ListEnumerator3::m_new2(){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>");
	c_IEnumerator3::m_new();
	return this;
}
void c_ListEnumerator3::p_CheckConcurrency(){
	DBG_ENTER("ListEnumerator.CheckConcurrency")
	c_ListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>");
	if(m_lst->m_modCount!=m_expectedModCount){
		DBG_BLOCK();
		throw (new c_ConcurrentModificationException)->m_new(String(L"ListEnumerator.CheckConcurrency: Concurrent list modification",61),0);
	}
}
bool c_ListEnumerator3::p_HasNext(){
	DBG_ENTER("ListEnumerator.HasNext")
	c_ListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>");
	bool t_=m_index<m_lst->p_Size();
	return t_;
}
c_XMLElement* c_ListEnumerator3::p_NextObject(){
	DBG_ENTER("ListEnumerator.NextObject")
	c_ListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>");
	c_XMLElement* t_=m_lst->p_Get2(m_lastIndex);
	return t_;
}
void c_ListEnumerator3::mark(){
	c_IEnumerator3::mark();
	gc_mark_q(m_lst);
}
String c_ListEnumerator3::debug(){
	String t="(ListEnumerator)\n";
	t=c_IEnumerator3::debug()+t;
	t+=dbg_decl("lst",&m_lst);
	t+=dbg_decl("lastIndex",&m_lastIndex);
	t+=dbg_decl("index",&m_index);
	t+=dbg_decl("expectedModCount",&m_expectedModCount);
	return t;
}
c_ArrayListEnumerator3::c_ArrayListEnumerator3(){
	m_alst=0;
}
c_ArrayListEnumerator3* c_ArrayListEnumerator3::m_new(c_ArrayList3* t_lst){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>");
	c_ListEnumerator3::m_new(t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>");
	gc_assign(this->m_alst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>");
	m_expectedModCount=m_alst->m_modCount;
	return this;
}
c_ArrayListEnumerator3* c_ArrayListEnumerator3::m_new2(){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>");
	c_ListEnumerator3::m_new2();
	return this;
}
bool c_ArrayListEnumerator3::p_HasNext(){
	DBG_ENTER("ArrayListEnumerator.HasNext")
	c_ArrayListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>");
	bool t_=m_index<m_alst->m_size;
	return t_;
}
c_XMLElement* c_ArrayListEnumerator3::p_NextObject(){
	DBG_ENTER("ArrayListEnumerator.NextObject")
	c_ArrayListEnumerator3 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>");
	c_XMLElement* t_=dynamic_cast<c_XMLElement*>(m_alst->m_elements.At(m_lastIndex));
	return t_;
}
void c_ArrayListEnumerator3::mark(){
	c_ListEnumerator3::mark();
	gc_mark_q(m_alst);
}
String c_ArrayListEnumerator3::debug(){
	String t="(ArrayListEnumerator)\n";
	t=c_ListEnumerator3::debug()+t;
	t+=dbg_decl("alst",&m_alst);
	return t;
}
c_ListEnumerator4::c_ListEnumerator4(){
	m_lst=0;
	m_expectedModCount=0;
	m_index=0;
	m_lastIndex=0;
}
c_ListEnumerator4* c_ListEnumerator4::m_new(c_IList4* t_lst){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>");
	c_IEnumerator4::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>");
	gc_assign(this->m_lst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>");
	m_expectedModCount=t_lst->m_modCount;
	return this;
}
c_ListEnumerator4* c_ListEnumerator4::m_new2(){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>");
	c_IEnumerator4::m_new();
	return this;
}
void c_ListEnumerator4::p_CheckConcurrency(){
	DBG_ENTER("ListEnumerator.CheckConcurrency")
	c_ListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>");
	if(m_lst->m_modCount!=m_expectedModCount){
		DBG_BLOCK();
		throw (new c_ConcurrentModificationException)->m_new(String(L"ListEnumerator.CheckConcurrency: Concurrent list modification",61),0);
	}
}
bool c_ListEnumerator4::p_HasNext(){
	DBG_ENTER("ListEnumerator.HasNext")
	c_ListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>");
	bool t_=m_index<m_lst->p_Size();
	return t_;
}
c_XMLAttribute* c_ListEnumerator4::p_NextObject(){
	DBG_ENTER("ListEnumerator.NextObject")
	c_ListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>");
	c_XMLAttribute* t_=m_lst->p_Get2(m_lastIndex);
	return t_;
}
void c_ListEnumerator4::mark(){
	c_IEnumerator4::mark();
	gc_mark_q(m_lst);
}
String c_ListEnumerator4::debug(){
	String t="(ListEnumerator)\n";
	t=c_IEnumerator4::debug()+t;
	t+=dbg_decl("lst",&m_lst);
	t+=dbg_decl("lastIndex",&m_lastIndex);
	t+=dbg_decl("index",&m_index);
	t+=dbg_decl("expectedModCount",&m_expectedModCount);
	return t;
}
c_ArrayListEnumerator4::c_ArrayListEnumerator4(){
	m_alst=0;
}
c_ArrayListEnumerator4* c_ArrayListEnumerator4::m_new(c_ArrayList4* t_lst){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>");
	c_ListEnumerator4::m_new(t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>");
	gc_assign(this->m_alst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>");
	m_expectedModCount=m_alst->m_modCount;
	return this;
}
c_ArrayListEnumerator4* c_ArrayListEnumerator4::m_new2(){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>");
	c_ListEnumerator4::m_new2();
	return this;
}
bool c_ArrayListEnumerator4::p_HasNext(){
	DBG_ENTER("ArrayListEnumerator.HasNext")
	c_ArrayListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>");
	bool t_=m_index<m_alst->m_size;
	return t_;
}
c_XMLAttribute* c_ArrayListEnumerator4::p_NextObject(){
	DBG_ENTER("ArrayListEnumerator.NextObject")
	c_ArrayListEnumerator4 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>");
	c_XMLAttribute* t_=dynamic_cast<c_XMLAttribute*>(m_alst->m_elements.At(m_lastIndex));
	return t_;
}
void c_ArrayListEnumerator4::mark(){
	c_ListEnumerator4::mark();
	gc_mark_q(m_alst);
}
String c_ArrayListEnumerator4::debug(){
	String t="(ArrayListEnumerator)\n";
	t=c_ListEnumerator4::debug()+t;
	t+=dbg_decl("alst",&m_alst);
	return t;
}
c_TileMapReader::c_TileMapReader(){
	m_tileMap=0;
	m_graphicsPath=String();
}
c_TileMapReader* c_TileMapReader::m_new(){
	DBG_ENTER("TileMapReader.new")
	c_TileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<40>");
	return this;
}
c_TileMap* c_TileMapReader::p_CreateMap(){
	DBG_ENTER("TileMapReader.CreateMap")
	c_TileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<48>");
	c_TileMap* t_=(new c_TileMap)->m_new();
	return t_;
}
void c_TileMapReader::mark(){
	Object::mark();
	gc_mark_q(m_tileMap);
}
String c_TileMapReader::debug(){
	String t="(TileMapReader)\n";
	t+=dbg_decl("tileMap",&m_tileMap);
	t+=dbg_decl("graphicsPath",&m_graphicsPath);
	return t;
}
c_TiledTileMapReader::c_TiledTileMapReader(){
	m_doc=0;
}
c_TiledTileMapReader* c_TiledTileMapReader::m_new(){
	DBG_ENTER("TiledTileMapReader.new")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<56>");
	c_TileMapReader::m_new();
	return this;
}
c_TileMapProperty* c_TiledTileMapReader::p_ReadProperty(c_XMLElement* t_node){
	DBG_ENTER("TiledTileMapReader.ReadProperty")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<145>");
	c_TileMapProperty* t_=(new c_TileMapProperty)->m_new(t_node->p_GetAttribute(String(L"name",4),String(L"default",7)),t_node->p_GetAttribute(String(L"value",5),String()));
	return t_;
}
void c_TiledTileMapReader::p_ReadProperties(c_XMLElement* t_node,Object* t_obj){
	DBG_ENTER("TiledTileMapReader.ReadProperties")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_LOCAL(t_obj,"obj")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<128>");
	c_TileMapPropertyContainer* t_cont=dynamic_cast<c_TileMapPropertyContainer*>(t_obj);
	DBG_LOCAL(t_cont,"cont")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<129>");
	if(t_cont!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<130>");
		c_IEnumerator3* t_=t_node->p_Children()->p_ObjectEnumerator();
		while(t_->p_HasNext()){
			DBG_BLOCK();
			c_XMLElement* t_propNode=t_->p_NextObject();
			DBG_LOCAL(t_propNode,"propNode")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<131>");
			if(t_propNode->p_Name()==String(L"properties",10)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<132>");
				c_IEnumerator3* t_2=t_propNode->p_Children()->p_ObjectEnumerator();
				while(t_2->p_HasNext()){
					DBG_BLOCK();
					c_XMLElement* t_child=t_2->p_NextObject();
					DBG_LOCAL(t_child,"child")
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<133>");
					if(t_child->p_Name()==String(L"property",8)){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<134>");
						c_TileMapProperty* t_prop=p_ReadProperty(t_child);
						DBG_LOCAL(t_prop,"prop")
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<135>");
						t_cont->m_properties->m_props->p_Set5(t_prop->m_name,t_prop);
					}
				}
				return;
			}
		}
	}
}
void c_TiledTileMapReader::p_DoPostLoad(Object* t_obj){
	DBG_ENTER("TiledTileMapReader.DoPostLoad")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_obj,"obj")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<124>");
	if(dynamic_cast<c_ITileMapPostLoad*>(t_obj)!=0){
		DBG_BLOCK();
		dynamic_cast<c_ITileMapPostLoad*>(t_obj)->p_PostLoad();
	}
}
c_TileMapImage* c_TiledTileMapReader::p_ReadImage(c_XMLElement* t_node){
	DBG_ENTER("TiledTileMapReader.ReadImage")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<226>");
	c_TileMapImage* t_rv=m_tileMap->p_CreateImage();
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<227>");
	p_ReadProperties(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<229>");
	if(t_node->p_HasAttribute(String(L"source",6))){
		DBG_BLOCK();
		t_rv->m_source=m_graphicsPath+bb_functions_StripDir(t_node->p_GetAttribute(String(L"source",6),String()));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<230>");
	if(t_node->p_HasAttribute(String(L"width",5))){
		DBG_BLOCK();
		t_rv->m_width=(t_node->p_GetAttribute(String(L"width",5),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<231>");
	if(t_node->p_HasAttribute(String(L"height",6))){
		DBG_BLOCK();
		t_rv->m_height=(t_node->p_GetAttribute(String(L"height",6),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<232>");
	if(t_node->p_HasAttribute(String(L"trans",5))){
		DBG_BLOCK();
		t_rv->m_trans=t_node->p_GetAttribute(String(L"trans",5),String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<233>");
	if(t_rv->m_trans.Length()>0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<234>");
		t_rv->m_transR=bb_tile_HexToDec(t_rv->m_trans.Slice(0,2));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<235>");
		t_rv->m_transG=bb_tile_HexToDec(t_rv->m_trans.Slice(2,4));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<236>");
		t_rv->m_transB=bb_tile_HexToDec(t_rv->m_trans.Slice(4,6));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<239>");
	p_DoPostLoad(t_rv);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<240>");
	return t_rv;
}
c_TileMapTile* c_TiledTileMapReader::p_ReadTile(c_XMLElement* t_node){
	DBG_ENTER("TiledTileMapReader.ReadTile")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<244>");
	int t_id=(t_node->p_GetAttribute(String(L"id",2),String(L"0",1))).ToInt();
	DBG_LOCAL(t_id,"id")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<245>");
	c_TileMapTile* t_rv=m_tileMap->p_CreateTile(t_id);
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<246>");
	p_ReadProperties(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<247>");
	p_DoPostLoad(t_rv);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<248>");
	return t_rv;
}
c_TileMapTileset* c_TiledTileMapReader::p_ReadTileset(c_XMLElement* t_node,c_TileMapTileset* t_target){
	DBG_ENTER("TiledTileMapReader.ReadTileset")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_LOCAL(t_target,"target")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<149>");
	c_TileMapTileset* t_rv=t_target;
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<150>");
	p_ReadProperties(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<151>");
	if(t_rv==0){
		DBG_BLOCK();
		t_rv=m_tileMap->p_CreateTileset();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<152>");
	if(t_node->p_HasAttribute(String(L"firstgid",8))){
		DBG_BLOCK();
		t_rv->m_firstGid=(t_node->p_GetAttribute(String(L"firstgid",8),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<154>");
	if(t_node->p_HasAttribute(String(L"source",6))){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<155>");
		t_rv->m_source=t_node->p_GetAttribute(String(L"source",6),String());
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<156>");
		c_XMLParser* t_parser=(new c_XMLParser)->m_new();
		DBG_LOCAL(t_parser,"parser")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<157>");
		c_XMLDocument* t_tilesetdoc=t_parser->p_ParseFile(t_rv->m_source);
		DBG_LOCAL(t_tilesetdoc,"tilesetdoc")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<158>");
		c_TileMapTileset* t_=p_ReadTileset(t_tilesetdoc->p_Root(),t_rv);
		return t_;
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<160>");
		if(t_node->p_HasAttribute(String(L"name",4))){
			DBG_BLOCK();
			t_rv->m_name=t_node->p_GetAttribute(String(L"name",4),String());
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<161>");
		if(t_node->p_HasAttribute(String(L"tilewidth",9))){
			DBG_BLOCK();
			t_rv->m_tileWidth=(t_node->p_GetAttribute(String(L"tilewidth",9),String())).ToInt();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<162>");
		if(t_node->p_HasAttribute(String(L"tileheight",10))){
			DBG_BLOCK();
			t_rv->m_tileHeight=(t_node->p_GetAttribute(String(L"tileheight",10),String())).ToInt();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<163>");
		if(t_node->p_HasAttribute(String(L"spacing",7))){
			DBG_BLOCK();
			t_rv->m_spacing=(t_node->p_GetAttribute(String(L"spacing",7),String())).ToInt();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<164>");
		if(t_node->p_HasAttribute(String(L"margin",6))){
			DBG_BLOCK();
			t_rv->m_margin=(t_node->p_GetAttribute(String(L"margin",6),String())).ToInt();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<166>");
		if(!t_node->p_Children()->p_IsEmpty()){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<167>");
			c_IEnumerator3* t_2=t_node->p_Children()->p_ObjectEnumerator();
			while(t_2->p_HasNext()){
				DBG_BLOCK();
				c_XMLElement* t_child=t_2->p_NextObject();
				DBG_LOCAL(t_child,"child")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<168>");
				if(t_child->p_Name()==String(L"image",5)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<169>");
					gc_assign(t_rv->m_imageNode,p_ReadImage(t_child));
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<170>");
					if(t_child->p_Name()==String(L"tile",4)){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<171>");
						t_rv->m_tileNodes->p_Add3(p_ReadTile(t_child));
					}
				}
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<176>");
	p_DoPostLoad(t_rv);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<177>");
	return t_rv;
}
void c_TiledTileMapReader::p_ReadLayerAttributes(c_XMLElement* t_node,c_TileMapLayer* t_layer){
	DBG_ENTER("TiledTileMapReader.ReadLayerAttributes")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_LOCAL(t_layer,"layer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<181>");
	if(t_node->p_HasAttribute(String(L"name",4))){
		DBG_BLOCK();
		t_layer->m_name=t_node->p_GetAttribute(String(L"name",4),String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<182>");
	if(t_node->p_HasAttribute(String(L"width",5))){
		DBG_BLOCK();
		t_layer->m_width=(t_node->p_GetAttribute(String(L"width",5),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<183>");
	if(t_node->p_HasAttribute(String(L"height",6))){
		DBG_BLOCK();
		t_layer->m_height=(t_node->p_GetAttribute(String(L"height",6),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<184>");
	t_layer->m_visible=((!t_node->p_HasAttribute(String(L"visible",7)) || (t_node->p_GetAttribute(String(L"visible",7),String())).ToInt()!=0)?1:0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<185>");
	if(t_node->p_HasAttribute(String(L"opacity",7))){
		DBG_BLOCK();
		t_layer->m_opacity=(t_node->p_GetAttribute(String(L"opacity",7),String())).ToFloat();
	}
}
c_TileMapData* c_TiledTileMapReader::p_ReadTileData(c_XMLElement* t_node,c_TileMapTileLayer* t_layer){
	DBG_ENTER("TiledTileMapReader.ReadTileData")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_LOCAL(t_layer,"layer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<265>");
	c_TileMapData* t_rv=m_tileMap->p_CreateData(t_layer->m_width,t_layer->m_height);
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<268>");
	String t_encoding=String();
	DBG_LOCAL(t_encoding,"encoding")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<269>");
	if(t_node->p_HasAttribute(String(L"encoding",8))){
		DBG_BLOCK();
		t_encoding=t_node->p_GetAttribute(String(L"encoding",8),String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<270>");
	if(t_encoding==String()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<272>");
		bb_assert_AssertError(String(L"Raw xml is currently not supported",34));
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<273>");
		if(t_encoding==String(L"csv",3)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<274>");
			Array<String > t_csv=t_node->p_Value().Split(String(L",",1));
			DBG_LOCAL(t_csv,"csv")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<275>");
			for(int t_i=0;t_i<t_csv.Length();t_i=t_i+1){
				DBG_BLOCK();
				DBG_LOCAL(t_i,"i")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<276>");
				int t_gid=(t_csv.At(t_i).Trim()).ToInt();
				DBG_LOCAL(t_gid,"gid")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<277>");
				t_rv->m_tiles.At(t_i)=t_gid;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<278>");
				gc_assign(t_rv->m_cells.At(t_i),m_tileMap->p_CreateCell(t_gid,t_i % t_rv->m_width,t_i/t_rv->m_width));
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<280>");
			if(t_encoding==String(L"base64",6)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<281>");
				Array<int > t_bytes=bb_base64_DecodeBase64Bytes(t_node->p_Value());
				DBG_LOCAL(t_bytes,"bytes")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<282>");
				if(t_node->p_HasAttribute(String(L"compression",11))){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<284>");
					bb_assert_AssertError(String(L"Compression is currently not supported",38));
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<286>");
				for(int t_i2=0;t_i2<t_bytes.Length();t_i2=t_i2+4){
					DBG_BLOCK();
					DBG_LOCAL(t_i2,"i")
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<288>");
					int t_gid2=t_bytes.At(t_i2);
					DBG_LOCAL(t_gid2,"gid")
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<289>");
					t_gid2+=t_bytes.At(t_i2+1)<<8;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<290>");
					t_gid2+=t_bytes.At(t_i2+2)<<16;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<291>");
					t_gid2+=t_bytes.At(t_i2+3)<<24;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<292>");
					t_rv->m_tiles.At(t_i2/4)=t_gid2;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<293>");
					gc_assign(t_rv->m_cells.At(t_i2/4),m_tileMap->p_CreateCell(t_gid2,t_i2/4 % t_rv->m_width,t_i2/4/t_rv->m_width));
				}
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<296>");
	return t_rv;
}
c_TileMapTileLayer* c_TiledTileMapReader::p_ReadTileLayer(c_XMLElement* t_node){
	DBG_ENTER("TiledTileMapReader.ReadTileLayer")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<189>");
	c_TileMapTileLayer* t_rv=m_tileMap->p_CreateTileLayer();
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<190>");
	p_ReadProperties(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<191>");
	p_ReadLayerAttributes(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<193>");
	if(t_rv->m_properties->p_Has(String(L"parallax_offset_x",17))){
		DBG_BLOCK();
		t_rv->m_parallaxOffsetX=t_rv->m_properties->p_Get(String(L"parallax_offset_x",17))->p_GetFloat();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<194>");
	if(t_rv->m_properties->p_Has(String(L"parallax_offset_y",17))){
		DBG_BLOCK();
		t_rv->m_parallaxOffsetY=t_rv->m_properties->p_Get(String(L"parallax_offset_y",17))->p_GetFloat();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<195>");
	if(t_rv->m_properties->p_Has(String(L"parallax_scale_x",16))){
		DBG_BLOCK();
		t_rv->m_parallaxScaleX=t_rv->m_properties->p_Get(String(L"parallax_scale_x",16))->p_GetFloat();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<196>");
	if(t_rv->m_properties->p_Has(String(L"parallax_scale_y",16))){
		DBG_BLOCK();
		t_rv->m_parallaxScaleY=t_rv->m_properties->p_Get(String(L"parallax_scale_y",16))->p_GetFloat();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<198>");
	c_IEnumerator3* t_=t_node->p_Children()->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_XMLElement* t_child=t_->p_NextObject();
		DBG_LOCAL(t_child,"child")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<199>");
		if(t_child->p_Name()==String(L"data",4)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<200>");
			gc_assign(t_rv->m_mapData,p_ReadTileData(t_child,t_rv));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<204>");
	p_DoPostLoad(t_rv);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<205>");
	return t_rv;
}
c_TileMapObject* c_TiledTileMapReader::p_ReadObject(c_XMLElement* t_node,c_TileMapObjectLayer* t_layer){
	DBG_ENTER("TiledTileMapReader.ReadObject")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_LOCAL(t_layer,"layer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<252>");
	c_TileMapObject* t_rv=m_tileMap->p_CreateObject();
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<253>");
	p_ReadProperties(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<254>");
	if(t_node->p_HasAttribute(String(L"name",4))){
		DBG_BLOCK();
		t_rv->m_name=t_node->p_GetAttribute(String(L"name",4),String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<255>");
	if(t_node->p_HasAttribute(String(L"type",4))){
		DBG_BLOCK();
		t_rv->m_objectType=t_node->p_GetAttribute(String(L"type",4),String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<256>");
	if(t_node->p_HasAttribute(String(L"x",1))){
		DBG_BLOCK();
		t_rv->m_x=(t_node->p_GetAttribute(String(L"x",1),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<257>");
	if(t_node->p_HasAttribute(String(L"y",1))){
		DBG_BLOCK();
		t_rv->m_y=(t_node->p_GetAttribute(String(L"y",1),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<258>");
	if(t_node->p_HasAttribute(String(L"width",5))){
		DBG_BLOCK();
		t_rv->m_width=(t_node->p_GetAttribute(String(L"width",5),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<259>");
	if(t_node->p_HasAttribute(String(L"height",6))){
		DBG_BLOCK();
		t_rv->m_height=(t_node->p_GetAttribute(String(L"height",6),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<260>");
	p_DoPostLoad(t_rv);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<261>");
	return t_rv;
}
c_TileMapObjectLayer* c_TiledTileMapReader::p_ReadObjectLayer(c_XMLElement* t_node){
	DBG_ENTER("TiledTileMapReader.ReadObjectLayer")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<209>");
	c_TileMapObjectLayer* t_rv=m_tileMap->p_CreateObjectLayer();
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<210>");
	p_ReadProperties(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<211>");
	p_ReadLayerAttributes(t_node,(t_rv));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<213>");
	if(t_node->p_HasAttribute(String(L"color",5))){
		DBG_BLOCK();
		t_rv->m_color=bb_tile_ColorToInt(t_node->p_GetAttribute(String(L"color",5),String()));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<215>");
	c_IEnumerator3* t_=t_node->p_Children()->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_XMLElement* t_child=t_->p_NextObject();
		DBG_LOCAL(t_child,"child")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<216>");
		if(t_child->p_Name()==String(L"object",6)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<217>");
			t_rv->m_objects->p_Add5(p_ReadObject(t_child,t_rv));
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<221>");
	p_DoPostLoad(t_rv);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<222>");
	return t_rv;
}
c_TileMap* c_TiledTileMapReader::p_ReadMap(c_XMLElement* t_node){
	DBG_ENTER("TiledTileMapReader.ReadMap")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<79>");
	gc_assign(m_tileMap,p_CreateMap());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<80>");
	p_ReadProperties(t_node,(m_tileMap));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<83>");
	if(m_tileMap->m_properties->p_Has(String(L"wrap_x",6))){
		DBG_BLOCK();
		m_tileMap->m_wrapX=m_tileMap->m_properties->p_Get(String(L"wrap_x",6))->p_GetBool();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<84>");
	if(m_tileMap->m_properties->p_Has(String(L"wrap_y",6))){
		DBG_BLOCK();
		m_tileMap->m_wrapY=m_tileMap->m_properties->p_Get(String(L"wrap_y",6))->p_GetBool();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<87>");
	if(t_node->p_HasAttribute(String(L"version",7))){
		DBG_BLOCK();
		m_tileMap->m_version=t_node->p_GetAttribute(String(L"version",7),String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<88>");
	if(t_node->p_HasAttribute(String(L"orientation",11))){
		DBG_BLOCK();
		m_tileMap->m_orientation=t_node->p_GetAttribute(String(L"orientation",11),String());
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<89>");
	if(t_node->p_HasAttribute(String(L"width",5))){
		DBG_BLOCK();
		m_tileMap->m_width=(t_node->p_GetAttribute(String(L"width",5),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<90>");
	if(t_node->p_HasAttribute(String(L"height",6))){
		DBG_BLOCK();
		m_tileMap->m_height=(t_node->p_GetAttribute(String(L"height",6),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<91>");
	if(t_node->p_HasAttribute(String(L"tilewidth",9))){
		DBG_BLOCK();
		m_tileMap->m_tileWidth=(t_node->p_GetAttribute(String(L"tilewidth",9),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<92>");
	if(t_node->p_HasAttribute(String(L"tileheight",10))){
		DBG_BLOCK();
		m_tileMap->m_tileHeight=(t_node->p_GetAttribute(String(L"tileheight",10),String())).ToInt();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<94>");
	m_tileMap->m_maxTileWidth=m_tileMap->m_tileWidth;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<95>");
	m_tileMap->m_maxTileHeight=m_tileMap->m_tileHeight;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<98>");
	if(!t_node->p_Children()->p_IsEmpty()){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<99>");
		c_IEnumerator3* t_=t_node->p_Children()->p_ObjectEnumerator();
		while(t_->p_HasNext()){
			DBG_BLOCK();
			c_XMLElement* t_mapchild=t_->p_NextObject();
			DBG_LOCAL(t_mapchild,"mapchild")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<101>");
			if(t_mapchild->p_Name()==String(L"tileset",7)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<102>");
				c_TileMapTileset* t_ts=p_ReadTileset(t_mapchild,0);
				DBG_LOCAL(t_ts,"ts")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<103>");
				m_tileMap->m_tilesets->p_Set6(t_ts->m_name,t_ts);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<106>");
				if(t_mapchild->p_Name()==String(L"layer",5)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<107>");
					c_TileMapLayer* t_layer=(p_ReadTileLayer(t_mapchild));
					DBG_LOCAL(t_layer,"layer")
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<108>");
					m_tileMap->m_layers->p_Add4(t_layer);
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<111>");
					if(t_mapchild->p_Name()==String(L"objectgroup",11)){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<112>");
						c_TileMapLayer* t_layer2=(p_ReadObjectLayer(t_mapchild));
						DBG_LOCAL(t_layer2,"layer")
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<113>");
						m_tileMap->m_layers->p_Add4(t_layer2);
					}
				}
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<118>");
	p_DoPostLoad(m_tileMap);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<120>");
	return m_tileMap;
}
c_TileMap* c_TiledTileMapReader::p_LoadMap(String t_filename){
	DBG_ENTER("TiledTileMapReader.LoadMap")
	c_TiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_filename,"filename")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<62>");
	c_XMLParser* t_parser=(new c_XMLParser)->m_new();
	DBG_LOCAL(t_parser,"parser")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<63>");
	String t_xmlString=bb_app_LoadString(t_filename);
	DBG_LOCAL(t_xmlString,"xmlString")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<65>");
	if(!((t_xmlString).Length()!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<66>");
		bb_assert_AssertError(String(L"Cannot load tile map file ",26)+t_filename);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<69>");
	int t_findData=t_xmlString.Find(String(L"<data encoding",14),0);
	DBG_LOCAL(t_findData,"findData")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<70>");
	if(t_findData==-1){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<71>");
		bb_assert_AssertError(String(L"Tiled Raw XML is not supported!",31));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<74>");
	gc_assign(m_doc,t_parser->p_ParseString(t_xmlString));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<75>");
	c_TileMap* t_=p_ReadMap(m_doc->p_Root());
	return t_;
}
void c_TiledTileMapReader::mark(){
	c_TileMapReader::mark();
	gc_mark_q(m_doc);
}
String c_TiledTileMapReader::debug(){
	String t="(TiledTileMapReader)\n";
	t=c_TileMapReader::debug()+t;
	t+=dbg_decl("doc",&m_doc);
	return t;
}
c_MyTiledTileMapReader::c_MyTiledTileMapReader(){
}
c_MyTiledTileMapReader* c_MyTiledTileMapReader::m_new(){
	DBG_ENTER("MyTiledTileMapReader.new")
	c_MyTiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<3>");
	c_TiledTileMapReader::m_new();
	return this;
}
c_TileMap* c_MyTiledTileMapReader::p_CreateMap(){
	DBG_ENTER("MyTiledTileMapReader.CreateMap")
	c_MyTiledTileMapReader *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<5>");
	c_TileMap* t_=((new c_MyTileMap)->m_new());
	return t_;
}
void c_MyTiledTileMapReader::mark(){
	c_TiledTileMapReader::mark();
}
String c_MyTiledTileMapReader::debug(){
	String t="(MyTiledTileMapReader)\n";
	t=c_TiledTileMapReader::debug()+t;
	return t;
}
c_TileMapPropertyContainer::c_TileMapPropertyContainer(){
	m_properties=(new c_TileMapProperties)->m_new();
}
c_TileMapPropertyContainer* c_TileMapPropertyContainer::m_new(){
	DBG_ENTER("TileMapPropertyContainer.new")
	c_TileMapPropertyContainer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<18>");
	return this;
}
void c_TileMapPropertyContainer::mark(){
	Object::mark();
	gc_mark_q(m_properties);
}
String c_TileMapPropertyContainer::debug(){
	String t="(TileMapPropertyContainer)\n";
	t+=dbg_decl("properties",&m_properties);
	return t;
}
c_TileMap::c_TileMap(){
	m_wrapX=false;
	m_wrapY=false;
	m_version=String(L"1.0",3);
	m_orientation=String(L"orthogonal",10);
	m_width=0;
	m_height=0;
	m_tileWidth=32;
	m_tileHeight=32;
	m_maxTileWidth=0;
	m_maxTileHeight=0;
	m_tilesets=(new c_StringMap7)->m_new();
	m_layers=(new c_ArrayList6)->m_new();
	m_tiles=Array<c_TileMapTile* >();
}
c_TileMap* c_TileMap::m_new(){
	DBG_ENTER("TileMap.new")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<322>");
	c_TileMapPropertyContainer::m_new();
	return this;
}
c_TileMapTileset* c_TileMap::p_CreateTileset(){
	DBG_ENTER("TileMap.CreateTileset")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<383>");
	c_TileMapTileset* t_=(new c_TileMapTileset)->m_new();
	return t_;
}
c_TileMapImage* c_TileMap::p_CreateImage(){
	DBG_ENTER("TileMap.CreateImage")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<398>");
	c_TileMapImage* t_=(new c_TileMapImage)->m_new();
	return t_;
}
c_TileMapTile* c_TileMap::p_CreateTile(int t_id){
	DBG_ENTER("TileMap.CreateTile")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_id,"id")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<378>");
	c_TileMapTile* t_=(new c_TileMapTile)->m_new(t_id);
	return t_;
}
c_TileMapTileLayer* c_TileMap::p_CreateTileLayer(){
	DBG_ENTER("TileMap.CreateTileLayer")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<388>");
	c_TileMapTileLayer* t_=(new c_TileMapTileLayer)->m_new();
	return t_;
}
c_TileMapData* c_TileMap::p_CreateData(int t_width,int t_height){
	DBG_ENTER("TileMap.CreateData")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_width,"width")
	DBG_LOCAL(t_height,"height")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<413>");
	c_TileMapData* t_=(new c_TileMapData)->m_new(t_width,t_height);
	return t_;
}
c_TileMapCell* c_TileMap::p_CreateCell(int t_gid,int t_x,int t_y){
	DBG_ENTER("TileMap.CreateCell")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_gid,"gid")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<408>");
	c_TileMapCell* t_=(new c_TileMapCell)->m_new(t_gid,t_x,t_y);
	return t_;
}
c_TileMapObjectLayer* c_TileMap::p_CreateObjectLayer(){
	DBG_ENTER("TileMap.CreateObjectLayer")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<393>");
	c_TileMapObjectLayer* t_=(new c_TileMapObjectLayer)->m_new();
	return t_;
}
c_TileMapObject* c_TileMap::p_CreateObject(){
	DBG_ENTER("TileMap.CreateObject")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<403>");
	c_TileMapObject* t_=(new c_TileMapObject)->m_new();
	return t_;
}
void c_TileMap::p_PreRenderMap(){
	DBG_ENTER("TileMap.PreRenderMap")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TileMap::p_ConfigureLayer(c_TileMapLayer* t_tileLayer){
	DBG_ENTER("TileMap.ConfigureLayer")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TileMap::p_PreRenderLayer(c_TileMapLayer* t_tileLayer){
	DBG_ENTER("TileMap.PreRenderLayer")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_tileLayer,"tileLayer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<350>");
	p_ConfigureLayer(t_tileLayer);
}
void c_TileMap::p_DrawTile2(c_TileMapTileLayer* t_tileLayer,c_TileMapTile* t_mapTile,int t_x,int t_y){
	DBG_ENTER("TileMap.DrawTile")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_tileLayer,"tileLayer")
	DBG_LOCAL(t_mapTile,"mapTile")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<373>");
	t_mapTile->m_image->p_DrawTile(Float(t_x),Float(t_y),t_mapTile->m_id,FLOAT(0.0),FLOAT(1.0),FLOAT(1.0));
}
void c_TileMap::p_PostRenderLayer(c_TileMapLayer* t_tileLayer){
	DBG_ENTER("TileMap.PostRenderLayer")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TileMap::p_PostRenderMap(){
	DBG_ENTER("TileMap.PostRenderMap")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TileMap::p_RenderMap(int t_bx,int t_by,int t_bw,int t_bh,Float t_sx,Float t_sy){
	DBG_ENTER("TileMap.RenderMap")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_bx,"bx")
	DBG_LOCAL(t_by,"by")
	DBG_LOCAL(t_bw,"bw")
	DBG_LOCAL(t_bh,"bh")
	DBG_LOCAL(t_sx,"sx")
	DBG_LOCAL(t_sy,"sy")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<496>");
	p_PreRenderMap();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<497>");
	int t_x=0;
	int t_y=0;
	int t_rx=0;
	int t_ry=0;
	int t_mx=0;
	int t_my=0;
	int t_mx2=0;
	int t_my2=0;
	int t_modx=0;
	int t_mody=0;
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_rx,"rx")
	DBG_LOCAL(t_ry,"ry")
	DBG_LOCAL(t_mx,"mx")
	DBG_LOCAL(t_my,"my")
	DBG_LOCAL(t_mx2,"mx2")
	DBG_LOCAL(t_my2,"my2")
	DBG_LOCAL(t_modx,"modx")
	DBG_LOCAL(t_mody,"mody")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<498>");
	c_IEnumerator5* t_=m_layers->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_TileMapLayer* t_layer=t_->p_NextObject();
		DBG_LOCAL(t_layer,"layer")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<499>");
		if(((t_layer->m_visible)!=0) && dynamic_cast<c_TileMapTileLayer*>(t_layer)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<500>");
			c_TileMapTileLayer* t_tl=dynamic_cast<c_TileMapTileLayer*>(t_layer);
			DBG_LOCAL(t_tl,"tl")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<501>");
			c_TileMapTile* t_mapTile=0;
			int t_gid=0;
			DBG_LOCAL(t_mapTile,"mapTile")
			DBG_LOCAL(t_gid,"gid")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<502>");
			p_PreRenderLayer(t_layer);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<504>");
			if(m_orientation==String(L"orthogonal",10)){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<505>");
				t_modx=int((Float)fmod(Float(t_bx)*t_tl->m_parallaxScaleX,Float(m_tileWidth)));
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<506>");
				t_mody=int((Float)fmod(Float(t_by)*t_tl->m_parallaxScaleY,Float(m_tileHeight)));
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<507>");
				t_y=t_by+m_tileHeight-t_tl->m_maxTileHeight;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<508>");
				t_my=int((Float)floor(Float(t_by)*t_tl->m_parallaxScaleY/Float(m_tileHeight)));
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<509>");
				while(t_y<t_by+t_bh+t_tl->m_maxTileHeight){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<510>");
					t_x=t_bx+m_tileWidth-t_tl->m_maxTileWidth;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<511>");
					t_mx=int((Float)floor(Float(t_bx)*t_tl->m_parallaxScaleX/Float(m_tileWidth)));
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<512>");
					while(t_x<t_bx+t_bw+t_tl->m_maxTileWidth){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<513>");
						if((m_wrapX || t_mx>=0 && t_mx<m_width) && (m_wrapY || t_my>=0 && t_my<m_height)){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<514>");
							t_mx2=t_mx;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<515>");
							t_my2=t_my;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<516>");
							while(t_mx2<0){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<517>");
								t_mx2+=m_width;
							}
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<519>");
							while(t_mx2>=m_width){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<520>");
								t_mx2-=m_width;
							}
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<522>");
							while(t_my2<0){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<523>");
								t_my2+=m_height;
							}
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<525>");
							while(t_my2>=m_height){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<526>");
								t_my2-=m_height;
							}
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<528>");
							t_gid=t_tl->m_mapData->m_cells.At(t_mx2+t_my2*t_tl->m_mapData->m_width)->m_gid;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<529>");
							if(t_gid>0){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<530>");
								t_mapTile=m_tiles.At(t_gid-1);
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<532>");
								if(t_modx<0){
									DBG_BLOCK();
									t_modx+=m_tileWidth;
								}
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<533>");
								if(t_mody<0){
									DBG_BLOCK();
									t_mody+=m_tileHeight;
								}
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<534>");
								t_rx=t_x-t_modx-t_bx;
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<535>");
								t_ry=t_y-t_mody-t_by;
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<537>");
								p_DrawTile2(t_tl,t_mapTile,t_rx,t_ry);
							}
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<540>");
						t_x+=m_tileWidth;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<541>");
						t_mx+=1;
					}
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<543>");
					t_y+=m_tileHeight;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<544>");
					t_my+=1;
				}
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<548>");
				if(m_orientation==String(L"isometric",9)){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<550>");
					for(t_y=0;t_y<t_tl->m_width+t_tl->m_height;t_y=t_y+1){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<551>");
						t_ry=t_y;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<552>");
						t_rx=0;
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<553>");
						while(t_ry>=t_tl->m_height){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<554>");
							t_ry-=1;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<555>");
							t_rx+=1;
						}
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<557>");
						while(t_ry>=0 && t_rx<t_tl->m_width){
							DBG_BLOCK();
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<558>");
							t_gid=t_tl->m_mapData->m_cells.At(t_rx+t_ry*t_tl->m_mapData->m_width)->m_gid;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<559>");
							if(t_gid>0){
								DBG_BLOCK();
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<560>");
								t_mapTile=m_tiles.At(t_gid-1);
								DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<561>");
								p_DrawTile2(t_tl,t_mapTile,(t_rx-t_ry-1)*m_tileWidth/2-t_bx,(t_rx+t_ry+2)*m_tileHeight/2-t_mapTile->m_height-t_by);
							}
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<563>");
							t_ry-=1;
							DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<564>");
							t_rx+=1;
						}
					}
				}
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<568>");
			p_PostRenderLayer(t_layer);
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<571>");
	p_PostRenderMap();
}
void c_TileMap::p_PostLoad(){
	DBG_ENTER("TileMap.PostLoad")
	c_TileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<418>");
	int t_totaltiles=0;
	c_TileMapTileset* t_ts=0;
	DBG_LOCAL(t_totaltiles,"totaltiles")
	DBG_LOCAL(t_ts,"ts")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<419>");
	c_ArrayList5* t_alltiles=(new c_ArrayList5)->m_new();
	DBG_LOCAL(t_alltiles,"alltiles")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<420>");
	c_ValueEnumerator* t_=m_tilesets->p_Values()->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_TileMapTileset* t_ts2=t_->p_NextObject();
		DBG_LOCAL(t_ts2,"ts")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<422>");
		gc_assign(t_ts2->m_image,bb_framework_diddyGame->m_images->p_LoadTileset2(t_ts2->m_imageNode->m_source,t_ts2->m_tileWidth,t_ts2->m_tileHeight,t_ts2->m_margin,t_ts2->m_spacing,String(),false,true,false,0,0,0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<424>");
		t_ts2->m_tileCount=t_ts2->m_image->m_tileCount;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<427>");
		if(m_maxTileWidth<t_ts2->m_tileWidth){
			DBG_BLOCK();
			m_maxTileWidth=t_ts2->m_tileWidth;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<428>");
		if(m_maxTileHeight<t_ts2->m_tileHeight){
			DBG_BLOCK();
			m_maxTileHeight=t_ts2->m_tileHeight;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<431>");
		gc_assign(t_ts2->m_tiles,Array<c_TileMapTile* >(t_ts2->m_tileCount));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<432>");
		c_IEnumerator6* t_2=t_ts2->m_tileNodes->p_ObjectEnumerator();
		while(t_2->p_HasNext()){
			DBG_BLOCK();
			c_TileMapTile* t_t=t_2->p_NextObject();
			DBG_LOCAL(t_t,"t")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<433>");
			gc_assign(t_ts2->m_tiles.At(t_t->m_id),t_t);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<435>");
		for(int t_i=0;t_i<t_ts2->m_tiles.Length();t_i=t_i+1){
			DBG_BLOCK();
			DBG_LOCAL(t_i,"i")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<436>");
			if(t_ts2->m_tiles.At(t_i)==0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<437>");
				gc_assign(t_ts2->m_tiles.At(t_i),p_CreateTile(t_i));
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<439>");
			t_ts2->m_tiles.At(t_i)->m_gid=t_ts2->m_firstGid+t_i;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<440>");
			gc_assign(t_ts2->m_tiles.At(t_i)->m_image,t_ts2->m_image);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<441>");
			t_ts2->m_tiles.At(t_i)->m_width=t_ts2->m_tileWidth;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<442>");
			t_ts2->m_tiles.At(t_i)->m_height=t_ts2->m_tileHeight;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<443>");
			t_alltiles->p_Add3(t_ts2->m_tiles.At(t_i));
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<446>");
		t_totaltiles+=t_ts2->m_tileCount;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<450>");
	gc_assign(m_tiles,Array<c_TileMapTile* >(t_totaltiles));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<451>");
	c_IEnumerator6* t_3=t_alltiles->p_ObjectEnumerator();
	while(t_3->p_HasNext()){
		DBG_BLOCK();
		c_TileMapTile* t_t2=t_3->p_NextObject();
		DBG_LOCAL(t_t2,"t")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<452>");
		gc_assign(m_tiles.At(t_t2->m_gid-1),t_t2);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<456>");
	c_IEnumerator5* t_4=m_layers->p_ObjectEnumerator();
	while(t_4->p_HasNext()){
		DBG_BLOCK();
		c_TileMapLayer* t_l=t_4->p_NextObject();
		DBG_LOCAL(t_l,"l")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<457>");
		if(dynamic_cast<c_TileMapTileLayer*>(t_l)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<458>");
			c_TileMapTileLayer* t_tl=dynamic_cast<c_TileMapTileLayer*>(t_l);
			DBG_LOCAL(t_tl,"tl")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<459>");
			for(int t_i2=0;t_i2<t_tl->m_mapData->m_tiles.Length();t_i2=t_i2+1){
				DBG_BLOCK();
				DBG_LOCAL(t_i2,"i")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<460>");
				if(t_tl->m_mapData->m_tiles.At(t_i2)>0){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<461>");
					if(t_tl->m_maxTileWidth<m_tiles.At(t_tl->m_mapData->m_tiles.At(t_i2)-1)->m_width){
						DBG_BLOCK();
						t_tl->m_maxTileWidth=m_tiles.At(t_tl->m_mapData->m_tiles.At(t_i2)-1)->m_width;
					}
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<462>");
					if(t_tl->m_maxTileHeight<m_tiles.At(t_tl->m_mapData->m_tiles.At(t_i2)-1)->m_height){
						DBG_BLOCK();
						t_tl->m_maxTileHeight=m_tiles.At(t_tl->m_mapData->m_tiles.At(t_i2)-1)->m_height;
					}
				}
			}
		}
	}
}
void c_TileMap::mark(){
	c_TileMapPropertyContainer::mark();
	gc_mark_q(m_tilesets);
	gc_mark_q(m_layers);
	gc_mark_q(m_tiles);
}
String c_TileMap::debug(){
	String t="(TileMap)\n";
	t=c_TileMapPropertyContainer::debug()+t;
	t+=dbg_decl("version",&m_version);
	t+=dbg_decl("orientation",&m_orientation);
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("height",&m_height);
	t+=dbg_decl("tileWidth",&m_tileWidth);
	t+=dbg_decl("tileHeight",&m_tileHeight);
	t+=dbg_decl("tilesets",&m_tilesets);
	t+=dbg_decl("layers",&m_layers);
	t+=dbg_decl("tiles",&m_tiles);
	t+=dbg_decl("maxTileWidth",&m_maxTileWidth);
	t+=dbg_decl("maxTileHeight",&m_maxTileHeight);
	t+=dbg_decl("wrapX",&m_wrapX);
	t+=dbg_decl("wrapY",&m_wrapY);
	return t;
}
c_TileMapProperty::c_TileMapProperty(){
	m_name=String();
	m_rawValue=String();
	m_valueType=0;
}
c_TileMapProperty* c_TileMapProperty::m_new(String t_name,String t_value){
	DBG_ENTER("TileMapProperty.new")
	c_TileMapProperty *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<946>");
	this->m_name=t_name;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<947>");
	this->m_rawValue=t_value;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<948>");
	this->m_valueType=3;
	return this;
}
bool c_TileMapProperty::p_GetBool(){
	DBG_ENTER("TileMapProperty.GetBool")
	c_TileMapProperty *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<984>");
	String t_val=m_rawValue.ToLower();
	DBG_LOCAL(t_val,"val")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<985>");
	if(t_val==String(L"true",4) || t_val==String(L"t",1) || t_val==String(L"y",1)){
		DBG_BLOCK();
		return true;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<986>");
	return false;
}
Float c_TileMapProperty::p_GetFloat(){
	DBG_ENTER("TileMapProperty.GetFloat")
	c_TileMapProperty *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<980>");
	Float t_=(m_rawValue).ToFloat();
	return t_;
}
int c_TileMapProperty::p_GetInt2(){
	DBG_ENTER("TileMapProperty.GetInt")
	c_TileMapProperty *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<976>");
	int t_=(m_rawValue).ToInt();
	return t_;
}
void c_TileMapProperty::mark(){
	Object::mark();
}
String c_TileMapProperty::debug(){
	String t="(TileMapProperty)\n";
	t+=dbg_decl("valueType",&m_valueType);
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("rawValue",&m_rawValue);
	return t;
}
c_TileMapProperties::c_TileMapProperties(){
	m_props=(new c_StringMap6)->m_new();
}
c_TileMapProperties* c_TileMapProperties::m_new(){
	DBG_ENTER("TileMapProperties.new")
	c_TileMapProperties *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<303>");
	return this;
}
bool c_TileMapProperties::p_Has(String t_name){
	DBG_ENTER("TileMapProperties.Has")
	c_TileMapProperties *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<307>");
	bool t_=m_props->p_Contains(t_name);
	return t_;
}
c_TileMapProperty* c_TileMapProperties::p_Get(String t_name){
	DBG_ENTER("TileMapProperties.Get")
	c_TileMapProperties *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_name,"name")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<311>");
	c_TileMapProperty* t_=m_props->p_Get(t_name);
	return t_;
}
void c_TileMapProperties::mark(){
	Object::mark();
	gc_mark_q(m_props);
}
String c_TileMapProperties::debug(){
	String t="(TileMapProperties)\n";
	t+=dbg_decl("props",&m_props);
	return t;
}
c_Map6::c_Map6(){
	m_root=0;
}
c_Map6* c_Map6::m_new(){
	DBG_ENTER("Map.new")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>");
	return this;
}
int c_Map6::p_RotateLeft5(c_Node6* t_node){
	DBG_ENTER("Map.RotateLeft")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>");
	c_Node6* t_child=t_node->m_right;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>");
	gc_assign(t_node->m_right,t_child->m_left);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>");
	if((t_child->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>");
		gc_assign(t_child->m_left->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>");
		if(t_node==t_node->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>");
	gc_assign(t_child->m_left,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map6::p_RotateRight5(c_Node6* t_node){
	DBG_ENTER("Map.RotateRight")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>");
	c_Node6* t_child=t_node->m_left;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>");
	gc_assign(t_node->m_left,t_child->m_right);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>");
	if((t_child->m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>");
		gc_assign(t_child->m_right->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>");
		if(t_node==t_node->m_parent->m_right){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>");
	gc_assign(t_child->m_right,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map6::p_InsertFixup5(c_Node6* t_node){
	DBG_ENTER("Map.InsertFixup")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>");
	while(((t_node->m_parent)!=0) && t_node->m_parent->m_color==-1 && ((t_node->m_parent->m_parent)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>");
		if(t_node->m_parent==t_node->m_parent->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>");
			c_Node6* t_uncle=t_node->m_parent->m_parent->m_right;
			DBG_LOCAL(t_uncle,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>");
			if(((t_uncle)!=0) && t_uncle->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>");
				t_uncle->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>");
				t_uncle->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>");
				t_node=t_uncle->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>");
				if(t_node==t_node->m_parent->m_right){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>");
					p_RotateLeft5(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>");
				p_RotateRight5(t_node->m_parent->m_parent);
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>");
			c_Node6* t_uncle2=t_node->m_parent->m_parent->m_left;
			DBG_LOCAL(t_uncle2,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>");
			if(((t_uncle2)!=0) && t_uncle2->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>");
				t_uncle2->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>");
				t_uncle2->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>");
				t_node=t_uncle2->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>");
				if(t_node==t_node->m_parent->m_left){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>");
					p_RotateRight5(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>");
				p_RotateLeft5(t_node->m_parent->m_parent);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>");
	m_root->m_color=1;
	return 0;
}
bool c_Map6::p_Set5(String t_key,c_TileMapProperty* t_value){
	DBG_ENTER("Map.Set")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>");
	c_Node6* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>");
	c_Node6* t_parent=0;
	int t_cmp=0;
	DBG_LOCAL(t_parent,"parent")
	DBG_LOCAL(t_cmp,"cmp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>");
		t_parent=t_node;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>");
		t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>");
				gc_assign(t_node->m_value,t_value);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>");
				return false;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>");
	t_node=(new c_Node6)->m_new(t_key,t_value,-1,t_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>");
	if((t_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>");
			gc_assign(t_parent->m_right,t_node);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>");
			gc_assign(t_parent->m_left,t_node);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>");
		p_InsertFixup5(t_node);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>");
		gc_assign(m_root,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>");
	return true;
}
c_Node6* c_Map6::p_FindNode(String t_key){
	DBG_ENTER("Map.FindNode")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<157>");
	c_Node6* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<159>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<160>");
		int t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_LOCAL(t_cmp,"cmp")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<161>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<162>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<163>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<164>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<166>");
				return t_node;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<169>");
	return t_node;
}
bool c_Map6::p_Contains(String t_key){
	DBG_ENTER("Map.Contains")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<25>");
	bool t_=p_FindNode(t_key)!=0;
	return t_;
}
c_TileMapProperty* c_Map6::p_Get(String t_key){
	DBG_ENTER("Map.Get")
	c_Map6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<101>");
	c_Node6* t_node=p_FindNode(t_key);
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<102>");
	if((t_node)!=0){
		DBG_BLOCK();
		return t_node->m_value;
	}
	return 0;
}
void c_Map6::mark(){
	Object::mark();
	gc_mark_q(m_root);
}
String c_Map6::debug(){
	String t="(Map)\n";
	t+=dbg_decl("root",&m_root);
	return t;
}
c_StringMap6::c_StringMap6(){
}
c_StringMap6* c_StringMap6::m_new(){
	DBG_ENTER("StringMap.new")
	c_StringMap6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>");
	c_Map6::m_new();
	return this;
}
int c_StringMap6::p_Compare(String t_lhs,String t_rhs){
	DBG_ENTER("StringMap.Compare")
	c_StringMap6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>");
	int t_=t_lhs.Compare(t_rhs);
	return t_;
}
void c_StringMap6::mark(){
	c_Map6::mark();
}
String c_StringMap6::debug(){
	String t="(StringMap)\n";
	t=c_Map6::debug()+t;
	return t;
}
c_Node6::c_Node6(){
	m_key=String();
	m_right=0;
	m_left=0;
	m_value=0;
	m_color=0;
	m_parent=0;
}
c_Node6* c_Node6::m_new(String t_key,c_TileMapProperty* t_value,int t_color,c_Node6* t_parent){
	DBG_ENTER("Node.new")
	c_Node6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_LOCAL(t_color,"color")
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>");
	this->m_key=t_key;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>");
	gc_assign(this->m_value,t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>");
	this->m_color=t_color;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>");
	gc_assign(this->m_parent,t_parent);
	return this;
}
c_Node6* c_Node6::m_new2(){
	DBG_ENTER("Node.new")
	c_Node6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>");
	return this;
}
void c_Node6::mark(){
	Object::mark();
	gc_mark_q(m_right);
	gc_mark_q(m_left);
	gc_mark_q(m_value);
	gc_mark_q(m_parent);
}
String c_Node6::debug(){
	String t="(Node)\n";
	t+=dbg_decl("key",&m_key);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("color",&m_color);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("left",&m_left);
	t+=dbg_decl("right",&m_right);
	return t;
}
c_TileMapTileset::c_TileMapTileset(){
	m_firstGid=0;
	m_source=String();
	m_name=String();
	m_tileWidth=0;
	m_tileHeight=0;
	m_spacing=0;
	m_margin=0;
	m_imageNode=0;
	m_tileNodes=(new c_ArrayList5)->m_new();
	m_image=0;
	m_tileCount=0;
	m_tiles=Array<c_TileMapTile* >();
}
c_TileMapTileset* c_TileMapTileset::m_new(){
	DBG_ENTER("TileMapTileset.new")
	c_TileMapTileset *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<820>");
	return this;
}
void c_TileMapTileset::p_PostLoad(){
	DBG_ENTER("TileMapTileset.PostLoad")
	c_TileMapTileset *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TileMapTileset::mark(){
	Object::mark();
	gc_mark_q(m_imageNode);
	gc_mark_q(m_tileNodes);
	gc_mark_q(m_image);
	gc_mark_q(m_tiles);
}
String c_TileMapTileset::debug(){
	String t="(TileMapTileset)\n";
	t+=dbg_decl("firstGid",&m_firstGid);
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("tileWidth",&m_tileWidth);
	t+=dbg_decl("tileHeight",&m_tileHeight);
	t+=dbg_decl("spacing",&m_spacing);
	t+=dbg_decl("margin",&m_margin);
	t+=dbg_decl("source",&m_source);
	t+=dbg_decl("imageNode",&m_imageNode);
	t+=dbg_decl("tileNodes",&m_tileNodes);
	t+=dbg_decl("tiles",&m_tiles);
	t+=dbg_decl("image",&m_image);
	t+=dbg_decl("tileCount",&m_tileCount);
	return t;
}
c_TileMapImage::c_TileMapImage(){
	m_source=String();
	m_width=0;
	m_height=0;
	m_trans=String();
	m_transR=0;
	m_transG=0;
	m_transB=0;
}
c_TileMapImage* c_TileMapImage::m_new(){
	DBG_ENTER("TileMapImage.new")
	c_TileMapImage *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<844>");
	return this;
}
void c_TileMapImage::p_PostLoad(){
	DBG_ENTER("TileMapImage.PostLoad")
	c_TileMapImage *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TileMapImage::mark(){
	Object::mark();
}
String c_TileMapImage::debug(){
	String t="(TileMapImage)\n";
	t+=dbg_decl("source",&m_source);
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("height",&m_height);
	t+=dbg_decl("trans",&m_trans);
	t+=dbg_decl("transR",&m_transR);
	t+=dbg_decl("transG",&m_transG);
	t+=dbg_decl("transB",&m_transB);
	return t;
}
int bb_tile_HexToDec(String t_hexstr){
	DBG_ENTER("HexToDec")
	DBG_LOCAL(t_hexstr,"hexstr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1061>");
	String t_chars=String(L"0123456789abcdef",16);
	DBG_LOCAL(t_chars,"chars")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1062>");
	int t_rv=0;
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1063>");
	t_hexstr=t_hexstr.ToLower();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1064>");
	for(int t_i=0;t_i<=t_hexstr.Length()-1;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1065>");
		t_rv=t_rv<<4;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1066>");
		int t_idx=t_chars.Find(String((int)t_hexstr.At(t_i)),0);
		DBG_LOCAL(t_idx,"idx")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1067>");
		if(t_idx>=0){
			DBG_BLOCK();
			t_rv+=t_idx;
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1069>");
	return t_rv;
}
c_TileMapTile::c_TileMapTile(){
	m_id=0;
	m_image=0;
	m_height=0;
	m_gid=0;
	m_width=0;
	m_animDelay=0;
	m_animated=false;
	m_animNext=0;
	m_animDirection=0;
	m_hasAnimDirection=false;
}
c_TileMapTile* c_TileMapTile::m_new(int t_id){
	DBG_ENTER("TileMapTile.new")
	c_TileMapTile *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_id,"id")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1009>");
	c_TileMapPropertyContainer::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1010>");
	this->m_id=t_id;
	return this;
}
c_TileMapTile* c_TileMapTile::m_new2(){
	DBG_ENTER("TileMapTile.new")
	c_TileMapTile *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<996>");
	c_TileMapPropertyContainer::m_new();
	return this;
}
void c_TileMapTile::p_PostLoad(){
	DBG_ENTER("TileMapTile.PostLoad")
	c_TileMapTile *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1014>");
	if(m_properties->p_Has(String(L"anim_delay",10))){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1015>");
		m_animDelay=int(bb_framework_diddyGame->p_CalcAnimLength(m_properties->p_Get(String(L"anim_delay",10))->p_GetInt2()));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1016>");
		m_animated=true;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1018>");
	if(m_properties->p_Has(String(L"anim_next",9))){
		DBG_BLOCK();
		m_animNext=m_properties->p_Get(String(L"anim_next",9))->p_GetInt2();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1019>");
	if(m_properties->p_Has(String(L"anim_direction",14))){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1020>");
		m_animDirection=m_properties->p_Get(String(L"anim_direction",14))->p_GetInt2();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1021>");
		m_hasAnimDirection=true;
	}
}
void c_TileMapTile::mark(){
	c_TileMapPropertyContainer::mark();
	gc_mark_q(m_image);
}
String c_TileMapTile::debug(){
	String t="(TileMapTile)\n";
	t=c_TileMapPropertyContainer::debug()+t;
	t+=dbg_decl("id",&m_id);
	t+=dbg_decl("image",&m_image);
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("height",&m_height);
	t+=dbg_decl("gid",&m_gid);
	t+=dbg_decl("animDelay",&m_animDelay);
	t+=dbg_decl("animNext",&m_animNext);
	t+=dbg_decl("animDirection",&m_animDirection);
	t+=dbg_decl("hasAnimDirection",&m_hasAnimDirection);
	t+=dbg_decl("animated",&m_animated);
	return t;
}
c_ICollection5::c_ICollection5(){
}
c_ICollection5* c_ICollection5::m_new(){
	DBG_ENTER("ICollection.new")
	c_ICollection5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>");
	return this;
}
c_IEnumerator6* c_ICollection5::p_ObjectEnumerator(){
	DBG_ENTER("ICollection.ObjectEnumerator")
	c_ICollection5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>");
	c_IEnumerator6* t_=p_Enumerator();
	return t_;
}
void c_ICollection5::mark(){
	Object::mark();
}
String c_ICollection5::debug(){
	String t="(ICollection)\n";
	return t;
}
c_IList5::c_IList5(){
	m_modCount=0;
}
c_IList5* c_IList5::m_new(){
	DBG_ENTER("IList.new")
	c_IList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>");
	c_ICollection5::m_new();
	return this;
}
c_IEnumerator6* c_IList5::p_Enumerator(){
	DBG_ENTER("IList.Enumerator")
	c_IList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>");
	c_IEnumerator6* t_=((new c_ListEnumerator5)->m_new(this));
	return t_;
}
void c_IList5::p_RangeCheck(int t_index){
	DBG_ENTER("IList.RangeCheck")
	c_IList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>");
	int t_size=this->p_Size();
	DBG_LOCAL(t_size,"size")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>");
	if(t_index<0 || t_index>=t_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"IList.RangeCheck: Index out of bounds: ",39)+String(t_index)+String(L" is not 0<=index<",17)+String(t_size),0);
	}
}
void c_IList5::mark(){
	c_ICollection5::mark();
}
String c_IList5::debug(){
	String t="(IList)\n";
	t=c_ICollection5::debug()+t;
	t+=dbg_decl("modCount",&m_modCount);
	return t;
}
c_ArrayList5::c_ArrayList5(){
	m_elements=Array<Object* >();
	m_size=0;
}
c_ArrayList5* c_ArrayList5::m_new(){
	DBG_ENTER("ArrayList.new")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>");
	c_IList5::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>");
	gc_assign(this->m_elements,Array<Object* >(10));
	return this;
}
c_ArrayList5* c_ArrayList5::m_new2(int t_initialCapacity){
	DBG_ENTER("ArrayList.new")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_initialCapacity,"initialCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>");
	c_IList5::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>");
	if(t_initialCapacity<0){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Capacity must be >= 0",36),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>");
	gc_assign(this->m_elements,Array<Object* >(t_initialCapacity));
	return this;
}
c_ArrayList5* c_ArrayList5::m_new3(c_ICollection5* t_c){
	DBG_ENTER("ArrayList.new")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_c,"c")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>");
	c_IList5::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>");
	if(!((t_c)!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Source collection must not be null",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>");
	gc_assign(m_elements,t_c->p_ToArray());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>");
	m_size=m_elements.Length();
	return this;
}
void c_ArrayList5::p_EnsureCapacity(int t_minCapacity){
	DBG_ENTER("ArrayList.EnsureCapacity")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_minCapacity,"minCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>");
	int t_oldCapacity=m_elements.Length();
	DBG_LOCAL(t_oldCapacity,"oldCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>");
	if(t_minCapacity>t_oldCapacity){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>");
		int t_newCapacity=t_oldCapacity*3/2+1;
		DBG_LOCAL(t_newCapacity,"newCapacity")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>");
		if(t_newCapacity<t_minCapacity){
			DBG_BLOCK();
			t_newCapacity=t_minCapacity;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>");
		gc_assign(m_elements,m_elements.Resize(t_newCapacity));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>");
		m_modCount+=1;
	}
}
bool c_ArrayList5::p_Add3(c_TileMapTile* t_o){
	DBG_ENTER("ArrayList.Add")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_o,"o")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>");
	if(m_size+1>m_elements.Length()){
		DBG_BLOCK();
		p_EnsureCapacity(m_size+1);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>");
	gc_assign(m_elements.At(m_size),(t_o));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>");
	m_size+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>");
	m_modCount+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>");
	return true;
}
c_IEnumerator6* c_ArrayList5::p_Enumerator(){
	DBG_ENTER("ArrayList.Enumerator")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>");
	c_IEnumerator6* t_=((new c_ArrayListEnumerator5)->m_new(this));
	return t_;
}
Array<Object* > c_ArrayList5::p_ToArray(){
	DBG_ENTER("ArrayList.ToArray")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>");
	Array<Object* > t_arr=Array<Object* >(m_size);
	DBG_LOCAL(t_arr,"arr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>");
	for(int t_i=0;t_i<m_size;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>");
		gc_assign(t_arr.At(t_i),m_elements.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>");
	return t_arr;
}
int c_ArrayList5::p_Size(){
	DBG_ENTER("ArrayList.Size")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>");
	return m_size;
}
void c_ArrayList5::p_RangeCheck(int t_index){
	DBG_ENTER("ArrayList.RangeCheck")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>");
	if(t_index<0 || t_index>=m_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"ArrayList.RangeCheck: Index out of bounds: ",43)+String(t_index)+String(L" is not 0<=index<",17)+String(m_size),0);
	}
}
c_TileMapTile* c_ArrayList5::p_Get2(int t_index){
	DBG_ENTER("ArrayList.Get")
	c_ArrayList5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>");
	p_RangeCheck(t_index);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>");
	c_TileMapTile* t_=dynamic_cast<c_TileMapTile*>(m_elements.At(t_index));
	return t_;
}
void c_ArrayList5::mark(){
	c_IList5::mark();
	gc_mark_q(m_elements);
}
String c_ArrayList5::debug(){
	String t="(ArrayList)\n";
	t=c_IList5::debug()+t;
	t+=dbg_decl("elements",&m_elements);
	t+=dbg_decl("size",&m_size);
	return t;
}
c_Map7::c_Map7(){
	m_root=0;
}
c_Map7* c_Map7::m_new(){
	DBG_ENTER("Map.new")
	c_Map7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<7>");
	return this;
}
int c_Map7::p_RotateLeft6(c_Node7* t_node){
	DBG_ENTER("Map.RotateLeft")
	c_Map7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<251>");
	c_Node7* t_child=t_node->m_right;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<252>");
	gc_assign(t_node->m_right,t_child->m_left);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<253>");
	if((t_child->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<254>");
		gc_assign(t_child->m_left->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<256>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<257>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<258>");
		if(t_node==t_node->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<259>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<261>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<264>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<266>");
	gc_assign(t_child->m_left,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<267>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map7::p_RotateRight6(c_Node7* t_node){
	DBG_ENTER("Map.RotateRight")
	c_Map7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<271>");
	c_Node7* t_child=t_node->m_left;
	DBG_LOCAL(t_child,"child")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<272>");
	gc_assign(t_node->m_left,t_child->m_right);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<273>");
	if((t_child->m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<274>");
		gc_assign(t_child->m_right->m_parent,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<276>");
	gc_assign(t_child->m_parent,t_node->m_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<277>");
	if((t_node->m_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<278>");
		if(t_node==t_node->m_parent->m_right){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<279>");
			gc_assign(t_node->m_parent->m_right,t_child);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<281>");
			gc_assign(t_node->m_parent->m_left,t_child);
		}
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<284>");
		gc_assign(m_root,t_child);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<286>");
	gc_assign(t_child->m_right,t_node);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<287>");
	gc_assign(t_node->m_parent,t_child);
	return 0;
}
int c_Map7::p_InsertFixup6(c_Node7* t_node){
	DBG_ENTER("Map.InsertFixup")
	c_Map7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<212>");
	while(((t_node->m_parent)!=0) && t_node->m_parent->m_color==-1 && ((t_node->m_parent->m_parent)!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<213>");
		if(t_node->m_parent==t_node->m_parent->m_parent->m_left){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<214>");
			c_Node7* t_uncle=t_node->m_parent->m_parent->m_right;
			DBG_LOCAL(t_uncle,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<215>");
			if(((t_uncle)!=0) && t_uncle->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<216>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<217>");
				t_uncle->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<218>");
				t_uncle->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<219>");
				t_node=t_uncle->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<221>");
				if(t_node==t_node->m_parent->m_right){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<222>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<223>");
					p_RotateLeft6(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<225>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<226>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<227>");
				p_RotateRight6(t_node->m_parent->m_parent);
			}
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<230>");
			c_Node7* t_uncle2=t_node->m_parent->m_parent->m_left;
			DBG_LOCAL(t_uncle2,"uncle")
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<231>");
			if(((t_uncle2)!=0) && t_uncle2->m_color==-1){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<232>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<233>");
				t_uncle2->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<234>");
				t_uncle2->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<235>");
				t_node=t_uncle2->m_parent;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<237>");
				if(t_node==t_node->m_parent->m_left){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<238>");
					t_node=t_node->m_parent;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<239>");
					p_RotateRight6(t_node);
				}
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<241>");
				t_node->m_parent->m_color=1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<242>");
				t_node->m_parent->m_parent->m_color=-1;
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<243>");
				p_RotateLeft6(t_node->m_parent->m_parent);
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<247>");
	m_root->m_color=1;
	return 0;
}
bool c_Map7::p_Set6(String t_key,c_TileMapTileset* t_value){
	DBG_ENTER("Map.Set")
	c_Map7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<29>");
	c_Node7* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<30>");
	c_Node7* t_parent=0;
	int t_cmp=0;
	DBG_LOCAL(t_parent,"parent")
	DBG_LOCAL(t_cmp,"cmp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<32>");
	while((t_node)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<33>");
		t_parent=t_node;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<34>");
		t_cmp=p_Compare(t_key,t_node->m_key);
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<35>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<36>");
			t_node=t_node->m_right;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<37>");
			if(t_cmp<0){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<38>");
				t_node=t_node->m_left;
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<40>");
				gc_assign(t_node->m_value,t_value);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<41>");
				return false;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<45>");
	t_node=(new c_Node7)->m_new(t_key,t_value,-1,t_parent);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<47>");
	if((t_parent)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<48>");
		if(t_cmp>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<49>");
			gc_assign(t_parent->m_right,t_node);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<51>");
			gc_assign(t_parent->m_left,t_node);
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<53>");
		p_InsertFixup6(t_node);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<55>");
		gc_assign(m_root,t_node);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<57>");
	return true;
}
c_MapValues* c_Map7::p_Values(){
	DBG_ENTER("Map.Values")
	c_Map7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<117>");
	c_MapValues* t_=(new c_MapValues)->m_new(this);
	return t_;
}
c_Node7* c_Map7::p_FirstNode(){
	DBG_ENTER("Map.FirstNode")
	c_Map7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<137>");
	if(!((m_root)!=0)){
		DBG_BLOCK();
		return 0;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<139>");
	c_Node7* t_node=m_root;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<140>");
	while((t_node->m_left)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<141>");
		t_node=t_node->m_left;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<143>");
	return t_node;
}
void c_Map7::mark(){
	Object::mark();
	gc_mark_q(m_root);
}
String c_Map7::debug(){
	String t="(Map)\n";
	t+=dbg_decl("root",&m_root);
	return t;
}
c_StringMap7::c_StringMap7(){
}
c_StringMap7* c_StringMap7::m_new(){
	DBG_ENTER("StringMap.new")
	c_StringMap7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<551>");
	c_Map7::m_new();
	return this;
}
int c_StringMap7::p_Compare(String t_lhs,String t_rhs){
	DBG_ENTER("StringMap.Compare")
	c_StringMap7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<554>");
	int t_=t_lhs.Compare(t_rhs);
	return t_;
}
void c_StringMap7::mark(){
	c_Map7::mark();
}
String c_StringMap7::debug(){
	String t="(StringMap)\n";
	t=c_Map7::debug()+t;
	return t;
}
c_Node7::c_Node7(){
	m_key=String();
	m_right=0;
	m_left=0;
	m_value=0;
	m_color=0;
	m_parent=0;
}
c_Node7* c_Node7::m_new(String t_key,c_TileMapTileset* t_value,int t_color,c_Node7* t_parent){
	DBG_ENTER("Node.new")
	c_Node7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_key,"key")
	DBG_LOCAL(t_value,"value")
	DBG_LOCAL(t_color,"color")
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<364>");
	this->m_key=t_key;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<365>");
	gc_assign(this->m_value,t_value);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<366>");
	this->m_color=t_color;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<367>");
	gc_assign(this->m_parent,t_parent);
	return this;
}
c_Node7* c_Node7::m_new2(){
	DBG_ENTER("Node.new")
	c_Node7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<361>");
	return this;
}
c_Node7* c_Node7::p_NextNode(){
	DBG_ENTER("Node.NextNode")
	c_Node7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<385>");
	c_Node7* t_node=0;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<386>");
	if((m_right)!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<387>");
		t_node=m_right;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<388>");
		while((t_node->m_left)!=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<389>");
			t_node=t_node->m_left;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<391>");
		return t_node;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<393>");
	t_node=this;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<394>");
	c_Node7* t_parent=this->m_parent;
	DBG_LOCAL(t_parent,"parent")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<395>");
	while(((t_parent)!=0) && t_node==t_parent->m_right){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<396>");
		t_node=t_parent;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<397>");
		t_parent=t_parent->m_parent;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<399>");
	return t_parent;
}
void c_Node7::mark(){
	Object::mark();
	gc_mark_q(m_right);
	gc_mark_q(m_left);
	gc_mark_q(m_value);
	gc_mark_q(m_parent);
}
String c_Node7::debug(){
	String t="(Node)\n";
	t+=dbg_decl("key",&m_key);
	t+=dbg_decl("value",&m_value);
	t+=dbg_decl("color",&m_color);
	t+=dbg_decl("parent",&m_parent);
	t+=dbg_decl("left",&m_left);
	t+=dbg_decl("right",&m_right);
	return t;
}
c_TileMapLayer::c_TileMapLayer(){
	m_name=String();
	m_width=0;
	m_height=0;
	m_visible=1;
	m_opacity=FLOAT(1.0);
}
c_TileMapLayer* c_TileMapLayer::m_new(){
	DBG_ENTER("TileMapLayer.new")
	c_TileMapLayer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<859>");
	c_TileMapPropertyContainer::m_new();
	return this;
}
void c_TileMapLayer::p_PostLoad(){
	DBG_ENTER("TileMapLayer.PostLoad")
	c_TileMapLayer *self=this;
	DBG_LOCAL(self,"Self")
}
void c_TileMapLayer::mark(){
	c_TileMapPropertyContainer::mark();
}
String c_TileMapLayer::debug(){
	String t="(TileMapLayer)\n";
	t=c_TileMapPropertyContainer::debug()+t;
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("height",&m_height);
	t+=dbg_decl("visible",&m_visible);
	t+=dbg_decl("opacity",&m_opacity);
	return t;
}
c_TileMapTileLayer::c_TileMapTileLayer(){
	m_parallaxOffsetX=FLOAT(0.0);
	m_parallaxOffsetY=FLOAT(0.0);
	m_parallaxScaleX=FLOAT(1.0);
	m_parallaxScaleY=FLOAT(1.0);
	m_mapData=0;
	m_maxTileHeight=0;
	m_maxTileWidth=0;
}
c_TileMapTileLayer* c_TileMapTileLayer::m_new(){
	DBG_ENTER("TileMapTileLayer.new")
	c_TileMapTileLayer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<905>");
	c_TileMapLayer::m_new();
	return this;
}
void c_TileMapTileLayer::mark(){
	c_TileMapLayer::mark();
	gc_mark_q(m_mapData);
}
String c_TileMapTileLayer::debug(){
	String t="(TileMapTileLayer)\n";
	t=c_TileMapLayer::debug()+t;
	t+=dbg_decl("mapData",&m_mapData);
	t+=dbg_decl("maxTileWidth",&m_maxTileWidth);
	t+=dbg_decl("maxTileHeight",&m_maxTileHeight);
	t+=dbg_decl("parallaxOffsetX",&m_parallaxOffsetX);
	t+=dbg_decl("parallaxOffsetY",&m_parallaxOffsetY);
	t+=dbg_decl("parallaxScaleX",&m_parallaxScaleX);
	t+=dbg_decl("parallaxScaleY",&m_parallaxScaleY);
	return t;
}
c_TileMapData::c_TileMapData(){
	m_width=0;
	m_height=0;
	m_tiles=Array<int >();
	m_cells=Array<c_TileMapCell* >();
}
c_TileMapData* c_TileMapData::m_new(int t_width,int t_height){
	DBG_ENTER("TileMapData.new")
	c_TileMapData *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_width,"width")
	DBG_LOCAL(t_height,"height")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<880>");
	this->m_width=t_width;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<881>");
	this->m_height=t_height;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<882>");
	gc_assign(this->m_tiles,Array<int >(t_width*t_height));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<883>");
	gc_assign(this->m_cells,Array<c_TileMapCell* >(t_width*t_height));
	return this;
}
c_TileMapData* c_TileMapData::m_new2(){
	DBG_ENTER("TileMapData.new")
	c_TileMapData *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<873>");
	return this;
}
void c_TileMapData::mark(){
	Object::mark();
	gc_mark_q(m_tiles);
	gc_mark_q(m_cells);
}
String c_TileMapData::debug(){
	String t="(TileMapData)\n";
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("height",&m_height);
	t+=dbg_decl("tiles",&m_tiles);
	t+=dbg_decl("cells",&m_cells);
	return t;
}
c_TileMapCell::c_TileMapCell(){
	m_gid=0;
	m_x=0;
	m_y=0;
	m_originalGid=0;
}
c_TileMapCell* c_TileMapCell::m_new(int t_gid,int t_x,int t_y){
	DBG_ENTER("TileMapCell.new")
	c_TileMapCell *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_gid,"gid")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1040>");
	this->m_gid=t_gid;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1041>");
	this->m_x=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1042>");
	this->m_y=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1043>");
	m_originalGid=t_gid;
	return this;
}
c_TileMapCell* c_TileMapCell::m_new2(){
	DBG_ENTER("TileMapCell.new")
	c_TileMapCell *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1028>");
	return this;
}
void c_TileMapCell::mark(){
	Object::mark();
}
String c_TileMapCell::debug(){
	String t="(TileMapCell)\n";
	t+=dbg_decl("gid",&m_gid);
	t+=dbg_decl("x",&m_x);
	t+=dbg_decl("y",&m_y);
	t+=dbg_decl("originalGid",&m_originalGid);
	return t;
}
Array<int > bb_base64_BASE64_ARRAY;
void bb_base64_InitBase64(){
	DBG_ENTER("InitBase64")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<117>");
	if(bb_base64_BASE64_ARRAY.Length()==0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<118>");
		gc_assign(bb_base64_BASE64_ARRAY,Array<int >(256));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<119>");
		int t_i=0;
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<120>");
		for(t_i=0;t_i<bb_base64_BASE64_ARRAY.Length();t_i=t_i+1){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<121>");
			bb_base64_BASE64_ARRAY.At(t_i)=-1;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<123>");
		for(t_i=0;t_i<String(L"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",65).Length();t_i=t_i+1){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<124>");
			bb_base64_BASE64_ARRAY.At((int)String(L"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",65).At(t_i))=t_i;
		}
	}
}
Array<int > bb_base64_DecodeBase64Bytes(String t_src){
	DBG_ENTER("DecodeBase64Bytes")
	DBG_LOCAL(t_src,"src")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<68>");
	bb_base64_InitBase64();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<69>");
	int t_a=0;
	int t_b=0;
	int t_c=0;
	int t_d=0;
	int t_i=0;
	int t_j=0;
	DBG_LOCAL(t_a,"a")
	DBG_LOCAL(t_b,"b")
	DBG_LOCAL(t_c,"c")
	DBG_LOCAL(t_d,"d")
	DBG_LOCAL(t_i,"i")
	DBG_LOCAL(t_j,"j")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<70>");
	Array<int > t_src2=Array<int >(t_src.Length());
	DBG_LOCAL(t_src2,"src2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<71>");
	int t_padding=0;
	DBG_LOCAL(t_padding,"padding")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<74>");
	int t_srclen=0;
	DBG_LOCAL(t_srclen,"srclen")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<75>");
	for(t_i=0;t_i<t_src.Length();t_i=t_i+1){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<76>");
		if(bb_base64_BASE64_ARRAY.At((int)t_src.At(t_i))>=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<77>");
			t_src2.At(t_srclen)=(int)t_src.At(t_i);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<78>");
			t_srclen+=1;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<80>");
			if(bb_base64_BASE64_ARRAY.At((int)t_src.At(t_i))==64){
				DBG_BLOCK();
				t_padding+=1;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<85>");
	if(t_srclen==0){
		DBG_BLOCK();
		return Array<int >();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<88>");
	int t_len=3*(t_srclen/4);
	DBG_LOCAL(t_len,"len")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<89>");
	if(t_srclen % 4==0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<90>");
		t_len-=t_padding;
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<91>");
		if(t_padding==0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<92>");
			if(t_srclen % 4>=2){
				DBG_BLOCK();
				t_len+=1;
			}
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<93>");
			if(t_srclen % 4==3){
				DBG_BLOCK();
				t_len+=1;
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<95>");
	Array<int > t_rv=Array<int >(t_len);
	DBG_LOCAL(t_rv,"rv")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<97>");
	t_i=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<98>");
	t_j=0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<99>");
	do{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<100>");
		t_a=bb_base64_BASE64_ARRAY.At(t_src2.At(t_i));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<101>");
		if(t_i+1>t_srclen){
			DBG_BLOCK();
			break;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<102>");
		t_b=bb_base64_BASE64_ARRAY.At(t_src2.At(t_i+1));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<103>");
		if(t_i+2<t_srclen){
			DBG_BLOCK();
			t_c=bb_base64_BASE64_ARRAY.At(t_src2.At(t_i+2));
		}else{
			DBG_BLOCK();
			t_c=64;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<104>");
		if(t_i+3<t_srclen){
			DBG_BLOCK();
			t_d=bb_base64_BASE64_ARRAY.At(t_src2.At(t_i+3));
		}else{
			DBG_BLOCK();
			t_d=64;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<105>");
		t_rv.At(t_j)=t_a<<2|t_b>>4;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<106>");
		if(t_j+1<t_len){
			DBG_BLOCK();
			t_rv.At(t_j+1)=(t_b&15)<<4|t_c>>2;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<107>");
		if(t_j+2<t_len){
			DBG_BLOCK();
			t_rv.At(t_j+2)=(t_c&3)<<6|t_d;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<108>");
		t_i+=4;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<109>");
		t_j+=3;
	}while(!(t_i>=t_srclen));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/base64.monkey<111>");
	return t_rv;
}
c_ICollection6::c_ICollection6(){
}
c_ICollection6* c_ICollection6::m_new(){
	DBG_ENTER("ICollection.new")
	c_ICollection6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>");
	return this;
}
c_IEnumerator5* c_ICollection6::p_ObjectEnumerator(){
	DBG_ENTER("ICollection.ObjectEnumerator")
	c_ICollection6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<51>");
	c_IEnumerator5* t_=p_Enumerator();
	return t_;
}
void c_ICollection6::mark(){
	Object::mark();
}
String c_ICollection6::debug(){
	String t="(ICollection)\n";
	return t;
}
c_IList6::c_IList6(){
	m_modCount=0;
}
c_IList6* c_IList6::m_new(){
	DBG_ENTER("IList.new")
	c_IList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>");
	c_ICollection6::m_new();
	return this;
}
c_IEnumerator5* c_IList6::p_Enumerator(){
	DBG_ENTER("IList.Enumerator")
	c_IList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<123>");
	c_IEnumerator5* t_=((new c_ListEnumerator6)->m_new(this));
	return t_;
}
void c_IList6::p_RangeCheck(int t_index){
	DBG_ENTER("IList.RangeCheck")
	c_IList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<98>");
	int t_size=this->p_Size();
	DBG_LOCAL(t_size,"size")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<100>");
	if(t_index<0 || t_index>=t_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"IList.RangeCheck: Index out of bounds: ",39)+String(t_index)+String(L" is not 0<=index<",17)+String(t_size),0);
	}
}
void c_IList6::mark(){
	c_ICollection6::mark();
}
String c_IList6::debug(){
	String t="(IList)\n";
	t=c_ICollection6::debug()+t;
	t+=dbg_decl("modCount",&m_modCount);
	return t;
}
c_ArrayList6::c_ArrayList6(){
	m_elements=Array<Object* >();
	m_size=0;
}
c_ArrayList6* c_ArrayList6::m_new(){
	DBG_ENTER("ArrayList.new")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>");
	c_IList6::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>");
	gc_assign(this->m_elements,Array<Object* >(10));
	return this;
}
c_ArrayList6* c_ArrayList6::m_new2(int t_initialCapacity){
	DBG_ENTER("ArrayList.new")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_initialCapacity,"initialCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>");
	c_IList6::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>");
	if(t_initialCapacity<0){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Capacity must be >= 0",36),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>");
	gc_assign(this->m_elements,Array<Object* >(t_initialCapacity));
	return this;
}
c_ArrayList6* c_ArrayList6::m_new3(c_ICollection6* t_c){
	DBG_ENTER("ArrayList.new")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_c,"c")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>");
	c_IList6::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>");
	if(!((t_c)!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Source collection must not be null",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>");
	gc_assign(m_elements,t_c->p_ToArray());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>");
	m_size=m_elements.Length();
	return this;
}
void c_ArrayList6::p_EnsureCapacity(int t_minCapacity){
	DBG_ENTER("ArrayList.EnsureCapacity")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_minCapacity,"minCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>");
	int t_oldCapacity=m_elements.Length();
	DBG_LOCAL(t_oldCapacity,"oldCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>");
	if(t_minCapacity>t_oldCapacity){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>");
		int t_newCapacity=t_oldCapacity*3/2+1;
		DBG_LOCAL(t_newCapacity,"newCapacity")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>");
		if(t_newCapacity<t_minCapacity){
			DBG_BLOCK();
			t_newCapacity=t_minCapacity;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>");
		gc_assign(m_elements,m_elements.Resize(t_newCapacity));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>");
		m_modCount+=1;
	}
}
bool c_ArrayList6::p_Add4(c_TileMapLayer* t_o){
	DBG_ENTER("ArrayList.Add")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_o,"o")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>");
	if(m_size+1>m_elements.Length()){
		DBG_BLOCK();
		p_EnsureCapacity(m_size+1);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>");
	gc_assign(m_elements.At(m_size),(t_o));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>");
	m_size+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>");
	m_modCount+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>");
	return true;
}
c_IEnumerator5* c_ArrayList6::p_Enumerator(){
	DBG_ENTER("ArrayList.Enumerator")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<417>");
	c_IEnumerator5* t_=((new c_ArrayListEnumerator6)->m_new(this));
	return t_;
}
Array<Object* > c_ArrayList6::p_ToArray(){
	DBG_ENTER("ArrayList.ToArray")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>");
	Array<Object* > t_arr=Array<Object* >(m_size);
	DBG_LOCAL(t_arr,"arr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>");
	for(int t_i=0;t_i<m_size;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>");
		gc_assign(t_arr.At(t_i),m_elements.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>");
	return t_arr;
}
int c_ArrayList6::p_Size(){
	DBG_ENTER("ArrayList.Size")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<480>");
	return m_size;
}
void c_ArrayList6::p_RangeCheck(int t_index){
	DBG_ENTER("ArrayList.RangeCheck")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<338>");
	if(t_index<0 || t_index>=m_size){
		DBG_BLOCK();
		throw (new c_IndexOutOfBoundsException)->m_new(String(L"ArrayList.RangeCheck: Index out of bounds: ",43)+String(t_index)+String(L" is not 0<=index<",17)+String(m_size),0);
	}
}
c_TileMapLayer* c_ArrayList6::p_Get2(int t_index){
	DBG_ENTER("ArrayList.Get")
	c_ArrayList6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_index,"index")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<534>");
	p_RangeCheck(t_index);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<535>");
	c_TileMapLayer* t_=dynamic_cast<c_TileMapLayer*>(m_elements.At(t_index));
	return t_;
}
void c_ArrayList6::mark(){
	c_IList6::mark();
	gc_mark_q(m_elements);
}
String c_ArrayList6::debug(){
	String t="(ArrayList)\n";
	t=c_IList6::debug()+t;
	t+=dbg_decl("elements",&m_elements);
	t+=dbg_decl("size",&m_size);
	return t;
}
c_TileMapObjectLayer::c_TileMapObjectLayer(){
	m_color=0;
	m_objects=(new c_ArrayList7)->m_new();
}
c_TileMapObjectLayer* c_TileMapObjectLayer::m_new(){
	DBG_ENTER("TileMapObjectLayer.new")
	c_TileMapObjectLayer *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<917>");
	c_TileMapLayer::m_new();
	return this;
}
void c_TileMapObjectLayer::mark(){
	c_TileMapLayer::mark();
	gc_mark_q(m_objects);
}
String c_TileMapObjectLayer::debug(){
	String t="(TileMapObjectLayer)\n";
	t=c_TileMapLayer::debug()+t;
	t+=dbg_decl("color",&m_color);
	t+=dbg_decl("objects",&m_objects);
	return t;
}
int bb_tile_ColorToInt(String t_str){
	DBG_ENTER("ColorToInt")
	DBG_LOCAL(t_str,"str")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<1055>");
	return 0;
}
c_TileMapObject::c_TileMapObject(){
	m_name=String();
	m_objectType=String();
	m_x=0;
	m_y=0;
	m_width=0;
	m_height=0;
}
c_TileMapObject* c_TileMapObject::m_new(){
	DBG_ENTER("TileMapObject.new")
	c_TileMapObject *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/tile.monkey<926>");
	c_TileMapPropertyContainer::m_new();
	return this;
}
void c_TileMapObject::mark(){
	c_TileMapPropertyContainer::mark();
}
String c_TileMapObject::debug(){
	String t="(TileMapObject)\n";
	t=c_TileMapPropertyContainer::debug()+t;
	t+=dbg_decl("name",&m_name);
	t+=dbg_decl("objectType",&m_objectType);
	t+=dbg_decl("x",&m_x);
	t+=dbg_decl("y",&m_y);
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("height",&m_height);
	return t;
}
c_ICollection7::c_ICollection7(){
}
c_ICollection7* c_ICollection7::m_new(){
	DBG_ENTER("ICollection.new")
	c_ICollection7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<26>");
	return this;
}
void c_ICollection7::mark(){
	Object::mark();
}
String c_ICollection7::debug(){
	String t="(ICollection)\n";
	return t;
}
c_IList7::c_IList7(){
	m_modCount=0;
}
c_IList7* c_IList7::m_new(){
	DBG_ENTER("IList.new")
	c_IList7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<91>");
	c_ICollection7::m_new();
	return this;
}
void c_IList7::mark(){
	c_ICollection7::mark();
}
String c_IList7::debug(){
	String t="(IList)\n";
	t=c_ICollection7::debug()+t;
	t+=dbg_decl("modCount",&m_modCount);
	return t;
}
c_ArrayList7::c_ArrayList7(){
	m_elements=Array<Object* >();
	m_size=0;
}
c_ArrayList7* c_ArrayList7::m_new(){
	DBG_ENTER("ArrayList.new")
	c_ArrayList7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<345>");
	c_IList7::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<346>");
	gc_assign(this->m_elements,Array<Object* >(10));
	return this;
}
c_ArrayList7* c_ArrayList7::m_new2(int t_initialCapacity){
	DBG_ENTER("ArrayList.new")
	c_ArrayList7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_initialCapacity,"initialCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<349>");
	c_IList7::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<350>");
	if(t_initialCapacity<0){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Capacity must be >= 0",36),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<351>");
	gc_assign(this->m_elements,Array<Object* >(t_initialCapacity));
	return this;
}
c_ArrayList7* c_ArrayList7::m_new3(c_ICollection7* t_c){
	DBG_ENTER("ArrayList.new")
	c_ArrayList7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_c,"c")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<354>");
	c_IList7::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<355>");
	if(!((t_c)!=0)){
		DBG_BLOCK();
		throw (new c_IllegalArgumentException)->m_new(String(L"ArrayList.New: Source collection must not be null",49),0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<356>");
	gc_assign(m_elements,t_c->p_ToArray());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<357>");
	m_size=m_elements.Length();
	return this;
}
void c_ArrayList7::p_EnsureCapacity(int t_minCapacity){
	DBG_ENTER("ArrayList.EnsureCapacity")
	c_ArrayList7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_minCapacity,"minCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<328>");
	int t_oldCapacity=m_elements.Length();
	DBG_LOCAL(t_oldCapacity,"oldCapacity")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<329>");
	if(t_minCapacity>t_oldCapacity){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<330>");
		int t_newCapacity=t_oldCapacity*3/2+1;
		DBG_LOCAL(t_newCapacity,"newCapacity")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<331>");
		if(t_newCapacity<t_minCapacity){
			DBG_BLOCK();
			t_newCapacity=t_minCapacity;
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<332>");
		gc_assign(m_elements,m_elements.Resize(t_newCapacity));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<333>");
		m_modCount+=1;
	}
}
bool c_ArrayList7::p_Add5(c_TileMapObject* t_o){
	DBG_ENTER("ArrayList.Add")
	c_ArrayList7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_o,"o")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<363>");
	if(m_size+1>m_elements.Length()){
		DBG_BLOCK();
		p_EnsureCapacity(m_size+1);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<364>");
	gc_assign(m_elements.At(m_size),(t_o));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<365>");
	m_size+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<366>");
	m_modCount+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<367>");
	return true;
}
Array<Object* > c_ArrayList7::p_ToArray(){
	DBG_ENTER("ArrayList.ToArray")
	c_ArrayList7 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<494>");
	Array<Object* > t_arr=Array<Object* >(m_size);
	DBG_LOCAL(t_arr,"arr")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<495>");
	for(int t_i=0;t_i<m_size;t_i=t_i+1){
		DBG_BLOCK();
		DBG_LOCAL(t_i,"i")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<496>");
		gc_assign(t_arr.At(t_i),m_elements.At(t_i));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<498>");
	return t_arr;
}
void c_ArrayList7::mark(){
	c_IList7::mark();
	gc_mark_q(m_elements);
}
String c_ArrayList7::debug(){
	String t="(ArrayList)\n";
	t=c_IList7::debug()+t;
	t+=dbg_decl("elements",&m_elements);
	t+=dbg_decl("size",&m_size);
	return t;
}
c_MyTileMap::c_MyTileMap(){
}
c_MyTileMap* c_MyTileMap::m_new(){
	DBG_ENTER("MyTileMap.new")
	c_MyTileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<9>");
	c_TileMap::m_new();
	return this;
}
void c_MyTileMap::p_ConfigureLayer(c_TileMapLayer* t_tileLayer){
	DBG_ENTER("MyTileMap.ConfigureLayer")
	c_MyTileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_tileLayer,"tileLayer")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<12>");
	bb_graphics_SetAlpha(t_tileLayer->m_opacity);
}
void c_MyTileMap::p_DrawTile2(c_TileMapTileLayer* t_tileLayer,c_TileMapTile* t_mapTile,int t_x,int t_y){
	DBG_ENTER("MyTileMap.DrawTile")
	c_MyTileMap *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_tileLayer,"tileLayer")
	DBG_LOCAL(t_mapTile,"mapTile")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/level.monkey<16>");
	t_mapTile->m_image->p_DrawTile(Float(t_x),Float(t_y),t_mapTile->m_id,FLOAT(0.0),FLOAT(1.0),FLOAT(1.0));
}
void c_MyTileMap::mark(){
	c_TileMap::mark();
}
String c_MyTileMap::debug(){
	String t="(MyTileMap)\n";
	t=c_TileMap::debug()+t;
	return t;
}
c_Bunny::c_Bunny(){
	m_bCount=0;
	m_flTimer=FLOAT(.0);
	m_direction=0;
	m_walkImagesTop=0;
	m_walkImagesBottom=0;
	m_walkImagesRight=0;
	m_walkImagesLeft=0;
	m_standImage=0;
	m_speed=FLOAT(4.0);
	m_flickering=false;
	m_health=3;
	m_isDead=false;
	m_bWidth=15;
	m_bHeight=25;
	m_beHeight=-9;
	m_beWidth=2;
}
c_Bunny* c_Bunny::m_new(c_GameImage* t_img,Float t_x,Float t_y,int t_bAmount){
	DBG_ENTER("Bunny.new")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_img,"img")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_bAmount,"bAmount")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<38>");
	c_Sprite::m_new2();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<39>");
	gc_assign(this->m_image,t_img);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<42>");
	this->m_x=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<43>");
	this->m_y=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<45>");
	m_bCount=t_bAmount;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<46>");
	m_flTimer=Float(bb_app_Millisecs());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<48>");
	this->p_SetHitBox(-t_img->m_w,int(-t_img->m_h2),32,32);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<49>");
	this->m_visible=true;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<50>");
	m_direction=2;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<53>");
	gc_assign(m_walkImagesTop,bb_framework_diddyGame->m_images->p_FindSet(String(L"bunny_top",9),32,32,2,true,String()));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<54>");
	gc_assign(m_walkImagesBottom,bb_framework_diddyGame->m_images->p_FindSet(String(L"bunny_bottom",12),32,32,2,true,String()));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<55>");
	gc_assign(m_walkImagesRight,bb_framework_diddyGame->m_images->p_FindSet(String(L"bunny_right",11),32,32,2,true,String()));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<56>");
	gc_assign(m_walkImagesLeft,bb_framework_diddyGame->m_images->p_FindSet(String(L"bunny_left",10),32,32,2,true,String()));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<57>");
	gc_assign(m_standImage,bb_framework_diddyGame->m_images->p_Find(String(L"bunny_bottom",12)));
	return this;
}
c_Bunny* c_Bunny::m_new2(){
	DBG_ENTER("Bunny.new")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<9>");
	c_Sprite::m_new2();
	return this;
}
void c_Bunny::p_CheckCollision(){
	DBG_ENTER("Bunny.CheckCollision")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<185>");
	c_Enumerator* t_=bb_hunterClass_hunters->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_Hunter* t_h=t_->p_NextObject();
		DBG_LOCAL(t_h,"h")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<186>");
		if(t_h->p_GetXpos()+Float(t_h->p_GetWidth())>m_x && t_h->p_GetXpos()<m_x+FLOAT(15.0) && t_h->p_GetYpos()+Float(t_h->p_GetHeight())>m_y && t_h->p_GetYpos()<m_y+FLOAT(25.0) && m_flickering==false){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<187>");
			bbPrint(String(L"hit",3));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<188>");
			m_health-=1;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<189>");
			m_flickering=true;
		}
	}
}
void c_Bunny::p_Update2(){
	DBG_ENTER("Bunny.Update")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<61>");
	if((bb_input_KeyDown(87))!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<62>");
		m_y-=m_speed;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<63>");
		m_direction=1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<65>");
	if((bb_input_KeyDown(83))!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<66>");
		m_y+=m_speed;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<67>");
		m_direction=2;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<69>");
	if((bb_input_KeyDown(65))!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<70>");
		m_x-=m_speed;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<71>");
		m_direction=3;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<73>");
	if((bb_input_KeyDown(68))!=0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<74>");
		m_x+=m_speed;
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<75>");
		m_direction=4;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<79>");
	if(((bb_input_MouseHit(0))!=0) && m_bCount>0){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<80>");
		bb_bulletClass_CreateBullet(int(bb_input_MouseX()),int(bb_input_MouseY()),int(m_x),int(m_y));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<81>");
		m_bCount-=1;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<84>");
	if(m_x<FLOAT(0.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<85>");
		m_x=FLOAT(0.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<87>");
	if(m_x>bb_framework_SCREEN_WIDTH-FLOAT(15.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<88>");
		m_x=bb_framework_SCREEN_WIDTH-FLOAT(15.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<90>");
	if(m_y<FLOAT(9.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<91>");
		m_y=FLOAT(9.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<93>");
	if(m_y>bb_framework_SCREEN_HEIGHT-FLOAT(25.0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<94>");
		m_y=bb_framework_SCREEN_HEIGHT-FLOAT(25.0);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<98>");
	if(m_bCount<=0 && ((bb_input_KeyHit(82))!=0)){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<99>");
		m_bCount=10;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<103>");
	p_CheckCollision();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<106>");
	if(m_health<=0 && m_isDead==false){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<107>");
		m_isDead=true;
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<110>");
	if(m_flickering==true){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<111>");
		if(Float(bb_app_Millisecs())-m_flTimer>FLOAT(3000.0)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<112>");
			m_flickering=false;
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<113>");
			m_flTimer=Float(bb_app_Millisecs());
		}
	}
}
int c_Bunny::p_GetXpos(){
	DBG_ENTER("Bunny.GetXpos")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<203>");
	int t_=int(m_x);
	return t_;
}
int c_Bunny::p_GetYpos(){
	DBG_ENTER("Bunny.GetYpos")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<207>");
	int t_=int(m_y);
	return t_;
}
int c_Bunny::p_GetHealth(){
	DBG_ENTER("Bunny.GetHealth")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<195>");
	return m_health;
}
void c_Bunny::p_Draw(){
	DBG_ENTER("Bunny.Draw")
	c_Bunny *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<119>");
	if(bb_mainClass_Debug){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<120>");
		p_DrawHitBox(FLOAT(0.0),FLOAT(0.0));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<123>");
	if(m_isDead==false){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<136>");
		if(m_direction==1){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<137>");
			m_walkImagesTop->p_Draw2(m_x,m_y,FLOAT(0.0),FLOAT(1.0),FLOAT(1.0),0);
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<138>");
			if(m_direction==2){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<139>");
				m_walkImagesBottom->p_Draw2(m_x,m_y,FLOAT(0.0),FLOAT(1.0),FLOAT(1.0),0);
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<140>");
				if(m_direction==3){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<141>");
					m_walkImagesLeft->p_Draw2(m_x,m_y,FLOAT(0.0),FLOAT(1.0),FLOAT(1.0),0);
				}else{
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<142>");
					if(m_direction==4){
						DBG_BLOCK();
						DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<143>");
						m_walkImagesRight->p_Draw2(m_x,m_y,FLOAT(0.0),FLOAT(1.0),FLOAT(1.0),0);
					}
				}
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<148>");
		bb_graphics_SetColor(FLOAT(255.0),FLOAT(255.0),FLOAT(255.0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<149>");
		int t_xdiff=m_bCount*3/2;
		DBG_LOCAL(t_xdiff,"xdiff")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<150>");
		if(m_bCount>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<151>");
			for(int t_x=0;t_x<=m_bCount-1;t_x=t_x+1){
				DBG_BLOCK();
				DBG_LOCAL(t_x,"x")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<152>");
				bb_graphics_DrawRect(Float(20+t_x*5),bb_framework_SCREEN_HEIGHT-FLOAT(50.0),FLOAT(3.0),FLOAT(15.0));
			}
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<155>");
		if(m_bCount<=0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<156>");
			bb_graphics_SetColor(FLOAT(255.0),FLOAT(0.0),FLOAT(0.0));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<157>");
			bb_graphics_DrawText(String(L"Reload!",7),bb_framework_SCREEN_WIDTH/FLOAT(2.0)-FLOAT(3.0),bb_framework_SCREEN_HEIGHT/FLOAT(2.0),FLOAT(0.0),FLOAT(0.0));
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<161>");
		if(m_health>0){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<162>");
			for(int t_x2=0;t_x2<=m_health-1;t_x2=t_x2+1){
				DBG_BLOCK();
				DBG_LOCAL(t_x2,"x")
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<163>");
				bb_graphics_SetColor(FLOAT(0.0),FLOAT(255.0),FLOAT(0.0));
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<164>");
				bb_graphics_DrawRect(Float(550+t_x2*15),bb_framework_SCREEN_HEIGHT-FLOAT(50.0),FLOAT(15.0),FLOAT(15.0));
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<171>");
	if(m_isDead){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<172>");
		bb_graphics_SetColor(FLOAT(255.0),FLOAT(0.0),FLOAT(0.0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<173>");
		bb_graphics_DrawCircle(m_x,m_y+Float(m_bWidth*2),FLOAT(10.0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<174>");
		bb_graphics_SetColor(FLOAT(255.0),FLOAT(255.0),FLOAT(255.0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<175>");
		bb_graphics_DrawRect(m_x-Float(m_bWidth),m_y+Float(m_bWidth),Float(m_bHeight),Float(m_bWidth));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<176>");
		bb_graphics_DrawRect(m_x-Float(m_bWidth),m_y+Float(m_bWidth),Float(m_beHeight),Float(m_beWidth));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<177>");
		bb_graphics_DrawRect(m_x-Float(m_bWidth),m_y+Float(m_bWidth*2)-Float(m_beWidth),Float(m_beHeight),Float(m_beWidth));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<178>");
		bb_graphics_SetColor(FLOAT(255.0),FLOAT(0.0),FLOAT(0.0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bunnyClass.monkey<179>");
		bb_graphics_DrawLine(m_x-Float(m_bWidth/2),m_y+Float(m_bWidth*2),m_x-Float(m_bWidth/2),m_y+Float(m_bWidth)+FLOAT(4.0));
	}
}
void c_Bunny::mark(){
	c_Sprite::mark();
	gc_mark_q(m_walkImagesTop);
	gc_mark_q(m_walkImagesBottom);
	gc_mark_q(m_walkImagesRight);
	gc_mark_q(m_walkImagesLeft);
	gc_mark_q(m_standImage);
}
String c_Bunny::debug(){
	String t="(Bunny)\n";
	t=c_Sprite::debug()+t;
	t+=dbg_decl("speed",&m_speed);
	t+=dbg_decl("health",&m_health);
	t+=dbg_decl("isDead",&m_isDead);
	t+=dbg_decl("bCount",&m_bCount);
	t+=dbg_decl("bWidth",&m_bWidth);
	t+=dbg_decl("bHeight",&m_bHeight);
	t+=dbg_decl("beWidth",&m_beWidth);
	t+=dbg_decl("beHeight",&m_beHeight);
	t+=dbg_decl("flickering",&m_flickering);
	t+=dbg_decl("flTimer",&m_flTimer);
	t+=dbg_decl("direction",&m_direction);
	t+=dbg_decl("walkImagesTop",&m_walkImagesTop);
	t+=dbg_decl("walkImagesBottom",&m_walkImagesBottom);
	t+=dbg_decl("walkImagesRight",&m_walkImagesRight);
	t+=dbg_decl("walkImagesLeft",&m_walkImagesLeft);
	t+=dbg_decl("standImage",&m_standImage);
	return t;
}
c_Bullet::c_Bullet(){
	m_sx=FLOAT(0.0);
	m_sy=FLOAT(0.0);
	m_tx=FLOAT(0.0);
	m_ty=FLOAT(0.0);
	m_cx=FLOAT(0.0);
	m_cy=FLOAT(0.0);
	m_dx=FLOAT(0.0);
	m_dy=FLOAT(0.0);
	m_speed=FLOAT(0.0);
	m_dt=0;
	m_radius=FLOAT(5.0);
}
c_Bullet* c_Bullet::m_new(){
	DBG_ENTER("Bullet.new")
	c_Bullet *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<44>");
	return this;
}
void c_Bullet::p_Init4(Float t_x,Float t_y,int t_xp,int t_yp){
	DBG_ENTER("Bullet.Init")
	c_Bullet *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_xp,"xp")
	DBG_LOCAL(t_yp,"yp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<58>");
	m_sx=Float(t_xp);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<59>");
	m_sy=Float(t_yp);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<60>");
	m_tx=t_x;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<61>");
	m_ty=t_y;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<62>");
	m_cx=Float(t_xp);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<63>");
	m_cy=Float(t_yp);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<64>");
	m_dx=m_tx-m_sx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<65>");
	m_dy=m_ty-m_sy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<66>");
	m_speed=Float(bb_bulletClass_GetDistance(int(m_tx),int(m_ty),int(m_sx),int(m_sy)))/FLOAT(4.0);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<67>");
	gc_assign(m_dt,(new c_DeltaTimer)->m_new(FLOAT(60.0)));
}
void c_Bullet::p_Update2(){
	DBG_ENTER("Bullet.Update")
	c_Bullet *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<71>");
	m_dt->p_UpdateDelta();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<72>");
	m_cx+=m_dx/m_speed*m_dt->m_delta;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<73>");
	m_cy+=m_dy/m_speed*m_dt->m_delta;
}
Float c_Bullet::p_GetXpos(){
	DBG_ENTER("Bullet.GetXpos")
	c_Bullet *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<82>");
	return m_cx;
}
Float c_Bullet::p_GetRadius(){
	DBG_ENTER("Bullet.GetRadius")
	c_Bullet *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<90>");
	return m_radius;
}
Float c_Bullet::p_GetYpos(){
	DBG_ENTER("Bullet.GetYpos")
	c_Bullet *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<86>");
	return m_cy;
}
void c_Bullet::p_Render(){
	DBG_ENTER("Bullet.Render")
	c_Bullet *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<77>");
	bb_graphics_SetColor(FLOAT(255.0),FLOAT(0.0),FLOAT(0.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<78>");
	bb_graphics_DrawCircle(m_cx,m_cy,m_radius);
}
void c_Bullet::mark(){
	Object::mark();
	gc_mark_q(m_dt);
}
String c_Bullet::debug(){
	String t="(Bullet)\n";
	t+=dbg_decl("sx",&m_sx);
	t+=dbg_decl("sy",&m_sy);
	t+=dbg_decl("tx",&m_tx);
	t+=dbg_decl("ty",&m_ty);
	t+=dbg_decl("cx",&m_cx);
	t+=dbg_decl("cy",&m_cy);
	t+=dbg_decl("dx",&m_dx);
	t+=dbg_decl("dy",&m_dy);
	t+=dbg_decl("speed",&m_speed);
	t+=dbg_decl("radius",&m_radius);
	t+=dbg_decl("dt",&m_dt);
	return t;
}
int bb_bulletClass_GetDistance(int t_tx,int t_ty,int t_sx,int t_sy){
	DBG_ENTER("GetDistance")
	DBG_LOCAL(t_tx,"tx")
	DBG_LOCAL(t_ty,"ty")
	DBG_LOCAL(t_sx,"sx")
	DBG_LOCAL(t_sy,"sy")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<38>");
	int t_diffx=0;
	int t_diffy=0;
	DBG_LOCAL(t_diffx,"diffx")
	DBG_LOCAL(t_diffy,"diffy")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<39>");
	t_diffx=t_tx-t_sx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<40>");
	t_diffy=t_ty-t_sy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<41>");
	int t_=int((Float)sqrt(Float(t_diffx*t_diffx+t_diffy*t_diffy)));
	return t_;
}
c_List::c_List(){
	m__head=((new c_HeadNode)->m_new());
}
c_List* c_List::m_new(){
	DBG_ENTER("List.new")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Node8* c_List::p_AddLast2(c_Bullet* t_data){
	DBG_ENTER("List.AddLast")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<108>");
	c_Node8* t_=(new c_Node8)->m_new(m__head,m__head->m__pred,t_data);
	return t_;
}
c_List* c_List::m_new2(Array<c_Bullet* > t_data){
	DBG_ENTER("List.new")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>");
	Array<c_Bullet* > t_=t_data;
	int t_2=0;
	while(t_2<t_.Length()){
		DBG_BLOCK();
		c_Bullet* t_t=t_.At(t_2);
		t_2=t_2+1;
		DBG_LOCAL(t_t,"t")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<14>");
		p_AddLast2(t_t);
	}
	return this;
}
c_Enumerator2* c_List::p_ObjectEnumerator(){
	DBG_ENTER("List.ObjectEnumerator")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<186>");
	c_Enumerator2* t_=(new c_Enumerator2)->m_new(this);
	return t_;
}
bool c_List::p_Equals5(c_Bullet* t_lhs,c_Bullet* t_rhs){
	DBG_ENTER("List.Equals")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<28>");
	bool t_=t_lhs==t_rhs;
	return t_;
}
int c_List::p_RemoveEach(c_Bullet* t_value){
	DBG_ENTER("List.RemoveEach")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<151>");
	c_Node8* t_node=m__head->m__succ;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<152>");
	while(t_node!=m__head){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<153>");
		c_Node8* t_succ=t_node->m__succ;
		DBG_LOCAL(t_succ,"succ")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<154>");
		if(p_Equals5(t_node->m__data,t_value)){
			DBG_BLOCK();
			t_node->p_Remove2();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<155>");
		t_node=t_succ;
	}
	return 0;
}
void c_List::p_Remove(c_Bullet* t_value){
	DBG_ENTER("List.Remove")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<137>");
	p_RemoveEach(t_value);
}
int c_List::p_Clear(){
	DBG_ENTER("List.Clear")
	c_List *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<36>");
	gc_assign(m__head->m__succ,m__head);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<37>");
	gc_assign(m__head->m__pred,m__head);
	return 0;
}
void c_List::mark(){
	Object::mark();
	gc_mark_q(m__head);
}
String c_List::debug(){
	String t="(List)\n";
	t+=dbg_decl("_head",&m__head);
	return t;
}
c_Node8::c_Node8(){
	m__succ=0;
	m__pred=0;
	m__data=0;
}
c_Node8* c_Node8::m_new(c_Node8* t_succ,c_Node8* t_pred,c_Bullet* t_data){
	DBG_ENTER("Node.new")
	c_Node8 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_succ,"succ")
	DBG_LOCAL(t_pred,"pred")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<261>");
	gc_assign(m__succ,t_succ);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<262>");
	gc_assign(m__pred,t_pred);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<263>");
	gc_assign(m__succ->m__pred,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<264>");
	gc_assign(m__pred->m__succ,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<265>");
	gc_assign(m__data,t_data);
	return this;
}
c_Node8* c_Node8::m_new2(){
	DBG_ENTER("Node.new")
	c_Node8 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<258>");
	return this;
}
int c_Node8::p_Remove2(){
	DBG_ENTER("Node.Remove")
	c_Node8 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<274>");
	if(m__succ->m__pred!=this){
		DBG_BLOCK();
		bbError(String(L"Illegal operation on removed node",33));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<276>");
	gc_assign(m__succ->m__pred,m__pred);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<277>");
	gc_assign(m__pred->m__succ,m__succ);
	return 0;
}
void c_Node8::mark(){
	Object::mark();
	gc_mark_q(m__succ);
	gc_mark_q(m__pred);
	gc_mark_q(m__data);
}
String c_Node8::debug(){
	String t="(Node)\n";
	t+=dbg_decl("_succ",&m__succ);
	t+=dbg_decl("_pred",&m__pred);
	t+=dbg_decl("_data",&m__data);
	return t;
}
c_HeadNode::c_HeadNode(){
}
c_HeadNode* c_HeadNode::m_new(){
	DBG_ENTER("HeadNode.new")
	c_HeadNode *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<310>");
	c_Node8::m_new2();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<311>");
	gc_assign(m__succ,(this));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<312>");
	gc_assign(m__pred,(this));
	return this;
}
void c_HeadNode::mark(){
	c_Node8::mark();
}
String c_HeadNode::debug(){
	String t="(HeadNode)\n";
	t=c_Node8::debug()+t;
	return t;
}
c_List* bb_bulletClass_bullets;
int bb_bulletClass_CreateBullet(int t_mx,int t_my,int t_xp,int t_yp){
	DBG_ENTER("CreateBullet")
	DBG_LOCAL(t_mx,"mx")
	DBG_LOCAL(t_my,"my")
	DBG_LOCAL(t_xp,"xp")
	DBG_LOCAL(t_yp,"yp")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<25>");
	c_Bullet* t_b=(new c_Bullet)->m_new();
	DBG_LOCAL(t_b,"b")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<26>");
	t_b->p_Init4(Float(t_mx),Float(t_my),t_xp,t_yp);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<27>");
	bb_bulletClass_bullets->p_AddLast2(t_b);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<28>");
	return 1;
}
c_Hunter::c_Hunter(){
	m_width=15;
	m_height=40;
	m_sx=FLOAT(.0);
	m_sy=FLOAT(.0);
	m_speed=FLOAT(.0);
	m_dt=0;
	m_hunterImage=0;
	m_dx=FLOAT(.0);
	m_dy=FLOAT(.0);
}
Float c_Hunter::p_GetXpos(){
	DBG_ENTER("Hunter.GetXpos")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<97>");
	return m_x;
}
int c_Hunter::p_GetWidth(){
	DBG_ENTER("Hunter.GetWidth")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<105>");
	return m_width;
}
Float c_Hunter::p_GetYpos(){
	DBG_ENTER("Hunter.GetYpos")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<101>");
	return m_y;
}
int c_Hunter::p_GetHeight(){
	DBG_ENTER("Hunter.GetHeight")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<109>");
	return m_height;
}
c_Hunter* c_Hunter::m_new(){
	DBG_ENTER("Hunter.new")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<45>");
	c_Sprite::m_new2();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<46>");
	int t_position=0;
	DBG_LOCAL(t_position,"position")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<47>");
	t_position=int(bb_random_Rnd2(FLOAT(1.0),FLOAT(5.0)));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<48>");
	int t_1=t_position;
	DBG_LOCAL(t_1,"1")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<49>");
	if(t_1==1){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<50>");
		m_sx=bb_random_Rnd2(FLOAT(0.0),FLOAT(641.0));
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<51>");
		m_sy=FLOAT(0.0);
	}else{
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<52>");
		if(t_1==2){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<53>");
			m_sx=bb_random_Rnd2(FLOAT(0.0),FLOAT(641.0));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<54>");
			m_sy=bb_framework_SCREEN_HEIGHT;
		}else{
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<55>");
			if(t_1==3){
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<56>");
				m_sx=FLOAT(0.0);
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<57>");
				m_sy=bb_random_Rnd2(FLOAT(0.0),FLOAT(481.0));
			}else{
				DBG_BLOCK();
				DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<58>");
				if(t_1==4){
					DBG_BLOCK();
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<59>");
					m_sx=bb_framework_SCREEN_WIDTH;
					DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<60>");
					m_sy=bb_random_Rnd2(FLOAT(0.0),FLOAT(481.0));
				}
			}
		}
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<62>");
	this->m_x=m_sx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<63>");
	this->m_y=m_sy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<64>");
	m_speed=bb_random_Rnd2(FLOAT(500.0),FLOAT(600.0));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<65>");
	gc_assign(m_dt,(new c_DeltaTimer)->m_new(FLOAT(60.0)));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<67>");
	this->m_visible=true;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<69>");
	gc_assign(m_hunterImage,bb_framework_diddyGame->m_images->p_FindSet(String(L"hunter_full0",12),40,50,11,true,String()));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<70>");
	p_SetFrame(0,11,125,false,true);
	return this;
}
void c_Hunter::p_CheckCollision(){
	DBG_ENTER("Hunter.CheckCollision")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<113>");
	c_Enumerator2* t_=bb_bulletClass_bullets->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_Bullet* t_bullet=t_->p_NextObject();
		DBG_LOCAL(t_bullet,"bullet")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<114>");
		if(t_bullet->p_GetXpos()+t_bullet->p_GetRadius()/FLOAT(2.0)>m_x && t_bullet->p_GetXpos()-t_bullet->p_GetRadius()/FLOAT(2.0)<m_x+Float(m_width) && t_bullet->p_GetYpos()+t_bullet->p_GetRadius()/FLOAT(2.0)>m_y && t_bullet->p_GetYpos()-t_bullet->p_GetRadius()/FLOAT(2.0)<m_y+Float(m_height)){
			DBG_BLOCK();
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<115>");
			bb_hunterClass_hunters->p_Remove3(this);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<116>");
			bb_bulletClass_bullets->p_Remove(t_bullet);
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<117>");
			bbPrint(String(L"Hunter killed",13));
			DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<118>");
			bb_mainClass_gameScreen->m_score+=100;
		}
	}
}
void c_Hunter::p_Update3(int t_tx,int t_ty){
	DBG_ENTER("Hunter.Update")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_tx,"tx")
	DBG_LOCAL(t_ty,"ty")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<74>");
	m_dt->p_UpdateDelta();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<75>");
	m_dx=Float(t_tx)-m_sx;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<76>");
	m_dy=Float(t_ty)-m_sy;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<77>");
	m_x+=m_dx/m_speed*m_dt->m_delta;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<78>");
	m_y+=m_dy/m_speed*m_dt->m_delta;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<79>");
	p_CheckCollision();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<80>");
	p_UpdateAnimation();
}
void c_Hunter::p_Render(){
	DBG_ENTER("Hunter.Render")
	c_Hunter *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<84>");
	p_Draw();
}
void c_Hunter::mark(){
	c_Sprite::mark();
	gc_mark_q(m_dt);
	gc_mark_q(m_hunterImage);
}
String c_Hunter::debug(){
	String t="(Hunter)\n";
	t=c_Sprite::debug()+t;
	t+=dbg_decl("sx",&m_sx);
	t+=dbg_decl("sy",&m_sy);
	t+=dbg_decl("dx",&m_dx);
	t+=dbg_decl("dy",&m_dy);
	t+=dbg_decl("speed",&m_speed);
	t+=dbg_decl("height",&m_height);
	t+=dbg_decl("width",&m_width);
	t+=dbg_decl("dt",&m_dt);
	t+=dbg_decl("hunterImage",&m_hunterImage);
	return t;
}
c_List2::c_List2(){
	m__head=((new c_HeadNode2)->m_new());
}
c_List2* c_List2::m_new(){
	DBG_ENTER("List.new")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	return this;
}
c_Node9* c_List2::p_AddLast3(c_Hunter* t_data){
	DBG_ENTER("List.AddLast")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<108>");
	c_Node9* t_=(new c_Node9)->m_new(m__head,m__head->m__pred,t_data);
	return t_;
}
c_List2* c_List2::m_new2(Array<c_Hunter* > t_data){
	DBG_ENTER("List.new")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<13>");
	Array<c_Hunter* > t_=t_data;
	int t_2=0;
	while(t_2<t_.Length()){
		DBG_BLOCK();
		c_Hunter* t_t=t_.At(t_2);
		t_2=t_2+1;
		DBG_LOCAL(t_t,"t")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<14>");
		p_AddLast3(t_t);
	}
	return this;
}
c_Enumerator* c_List2::p_ObjectEnumerator(){
	DBG_ENTER("List.ObjectEnumerator")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<186>");
	c_Enumerator* t_=(new c_Enumerator)->m_new(this);
	return t_;
}
bool c_List2::p_Equals6(c_Hunter* t_lhs,c_Hunter* t_rhs){
	DBG_ENTER("List.Equals")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lhs,"lhs")
	DBG_LOCAL(t_rhs,"rhs")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<28>");
	bool t_=t_lhs==t_rhs;
	return t_;
}
int c_List2::p_RemoveEach2(c_Hunter* t_value){
	DBG_ENTER("List.RemoveEach")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<151>");
	c_Node9* t_node=m__head->m__succ;
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<152>");
	while(t_node!=m__head){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<153>");
		c_Node9* t_succ=t_node->m__succ;
		DBG_LOCAL(t_succ,"succ")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<154>");
		if(p_Equals6(t_node->m__data,t_value)){
			DBG_BLOCK();
			t_node->p_Remove2();
		}
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<155>");
		t_node=t_succ;
	}
	return 0;
}
void c_List2::p_Remove3(c_Hunter* t_value){
	DBG_ENTER("List.Remove")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_value,"value")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<137>");
	p_RemoveEach2(t_value);
}
int c_List2::p_Clear(){
	DBG_ENTER("List.Clear")
	c_List2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<36>");
	gc_assign(m__head->m__succ,m__head);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<37>");
	gc_assign(m__head->m__pred,m__head);
	return 0;
}
void c_List2::mark(){
	Object::mark();
	gc_mark_q(m__head);
}
String c_List2::debug(){
	String t="(List)\n";
	t+=dbg_decl("_head",&m__head);
	return t;
}
c_Node9::c_Node9(){
	m__succ=0;
	m__pred=0;
	m__data=0;
}
c_Node9* c_Node9::m_new(c_Node9* t_succ,c_Node9* t_pred,c_Hunter* t_data){
	DBG_ENTER("Node.new")
	c_Node9 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_succ,"succ")
	DBG_LOCAL(t_pred,"pred")
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<261>");
	gc_assign(m__succ,t_succ);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<262>");
	gc_assign(m__pred,t_pred);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<263>");
	gc_assign(m__succ->m__pred,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<264>");
	gc_assign(m__pred->m__succ,this);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<265>");
	gc_assign(m__data,t_data);
	return this;
}
c_Node9* c_Node9::m_new2(){
	DBG_ENTER("Node.new")
	c_Node9 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<258>");
	return this;
}
int c_Node9::p_Remove2(){
	DBG_ENTER("Node.Remove")
	c_Node9 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<274>");
	if(m__succ->m__pred!=this){
		DBG_BLOCK();
		bbError(String(L"Illegal operation on removed node",33));
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<276>");
	gc_assign(m__succ->m__pred,m__pred);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<277>");
	gc_assign(m__pred->m__succ,m__succ);
	return 0;
}
void c_Node9::mark(){
	Object::mark();
	gc_mark_q(m__succ);
	gc_mark_q(m__pred);
	gc_mark_q(m__data);
}
String c_Node9::debug(){
	String t="(Node)\n";
	t+=dbg_decl("_succ",&m__succ);
	t+=dbg_decl("_pred",&m__pred);
	t+=dbg_decl("_data",&m__data);
	return t;
}
c_HeadNode2::c_HeadNode2(){
}
c_HeadNode2* c_HeadNode2::m_new(){
	DBG_ENTER("HeadNode.new")
	c_HeadNode2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<310>");
	c_Node9::m_new2();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<311>");
	gc_assign(m__succ,(this));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<312>");
	gc_assign(m__pred,(this));
	return this;
}
void c_HeadNode2::mark(){
	c_Node9::mark();
}
String c_HeadNode2::debug(){
	String t="(HeadNode)\n";
	t=c_Node9::debug()+t;
	return t;
}
c_List2* bb_hunterClass_hunters;
c_Enumerator::c_Enumerator(){
	m__list=0;
	m__curr=0;
}
c_Enumerator* c_Enumerator::m_new(c_List2* t_list){
	DBG_ENTER("Enumerator.new")
	c_Enumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_list,"list")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<326>");
	gc_assign(m__list,t_list);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<327>");
	gc_assign(m__curr,t_list->m__head->m__succ);
	return this;
}
c_Enumerator* c_Enumerator::m_new2(){
	DBG_ENTER("Enumerator.new")
	c_Enumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<323>");
	return this;
}
bool c_Enumerator::p_HasNext(){
	DBG_ENTER("Enumerator.HasNext")
	c_Enumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<331>");
	while(m__curr->m__succ->m__pred!=m__curr){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<332>");
		gc_assign(m__curr,m__curr->m__succ);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<334>");
	bool t_=m__curr!=m__list->m__head;
	return t_;
}
c_Hunter* c_Enumerator::p_NextObject(){
	DBG_ENTER("Enumerator.NextObject")
	c_Enumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<338>");
	c_Hunter* t_data=m__curr->m__data;
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<339>");
	gc_assign(m__curr,m__curr->m__succ);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<340>");
	return t_data;
}
void c_Enumerator::mark(){
	Object::mark();
	gc_mark_q(m__list);
	gc_mark_q(m__curr);
}
String c_Enumerator::debug(){
	String t="(Enumerator)\n";
	t+=dbg_decl("_list",&m__list);
	t+=dbg_decl("_curr",&m__curr);
	return t;
}
c_Enumerator2::c_Enumerator2(){
	m__list=0;
	m__curr=0;
}
c_Enumerator2* c_Enumerator2::m_new(c_List* t_list){
	DBG_ENTER("Enumerator.new")
	c_Enumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_list,"list")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<326>");
	gc_assign(m__list,t_list);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<327>");
	gc_assign(m__curr,t_list->m__head->m__succ);
	return this;
}
c_Enumerator2* c_Enumerator2::m_new2(){
	DBG_ENTER("Enumerator.new")
	c_Enumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<323>");
	return this;
}
bool c_Enumerator2::p_HasNext(){
	DBG_ENTER("Enumerator.HasNext")
	c_Enumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<331>");
	while(m__curr->m__succ->m__pred!=m__curr){
		DBG_BLOCK();
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<332>");
		gc_assign(m__curr,m__curr->m__succ);
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<334>");
	bool t_=m__curr!=m__list->m__head;
	return t_;
}
c_Bullet* c_Enumerator2::p_NextObject(){
	DBG_ENTER("Enumerator.NextObject")
	c_Enumerator2 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<338>");
	c_Bullet* t_data=m__curr->m__data;
	DBG_LOCAL(t_data,"data")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<339>");
	gc_assign(m__curr,m__curr->m__succ);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/list.monkey<340>");
	return t_data;
}
void c_Enumerator2::mark(){
	Object::mark();
	gc_mark_q(m__list);
	gc_mark_q(m__curr);
}
String c_Enumerator2::debug(){
	String t="(Enumerator)\n";
	t+=dbg_decl("_list",&m__list);
	t+=dbg_decl("_curr",&m__curr);
	return t;
}
int bb_bulletClass_UpdateBullets(){
	DBG_ENTER("UpdateBullets")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<9>");
	c_Enumerator2* t_=bb_bulletClass_bullets->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_Bullet* t_bullet=t_->p_NextObject();
		DBG_LOCAL(t_bullet,"bullet")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<10>");
		t_bullet->p_Update2();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<12>");
	return 1;
}
Float bb_random_Rnd(){
	DBG_ENTER("Rnd")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<21>");
	bb_random_Seed=bb_random_Seed*1664525+1013904223|0;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<22>");
	Float t_=Float(bb_random_Seed>>8&16777215)/FLOAT(16777216.0);
	return t_;
}
Float bb_random_Rnd2(Float t_low,Float t_high){
	DBG_ENTER("Rnd")
	DBG_LOCAL(t_low,"low")
	DBG_LOCAL(t_high,"high")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<30>");
	Float t_=bb_random_Rnd3(t_high-t_low)+t_low;
	return t_;
}
Float bb_random_Rnd3(Float t_range){
	DBG_ENTER("Rnd")
	DBG_LOCAL(t_range,"range")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/random.monkey<26>");
	Float t_=bb_random_Rnd()*t_range;
	return t_;
}
void bb_hunterClass_CreateHunter(){
	DBG_ENTER("CreateHunter")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<8>");
	c_Hunter* t_h=(new c_Hunter)->m_new();
	DBG_LOCAL(t_h,"h")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<10>");
	bb_hunterClass_hunters->p_AddLast3(t_h);
}
void bb_hunterClass_UpdateHunter(Float t_tx,Float t_ty){
	DBG_ENTER("UpdateHunter")
	DBG_LOCAL(t_tx,"tx")
	DBG_LOCAL(t_ty,"ty")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<14>");
	c_Enumerator* t_=bb_hunterClass_hunters->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_Hunter* t_hunter=t_->p_NextObject();
		DBG_LOCAL(t_hunter,"hunter")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<15>");
		t_hunter->p_Update3(int(t_tx),int(t_ty));
	}
}
int bb_bulletClass_RemoveBullets(){
	DBG_ENTER("RemoveBullets")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<33>");
	bb_bulletClass_bullets->p_Clear();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<34>");
	return 1;
}
void bb_hunterClass_RemoveHunter(){
	DBG_ENTER("RemoveHunter")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<26>");
	bb_hunterClass_hunters->p_Clear();
}
c_IEnumerator5::c_IEnumerator5(){
}
c_IEnumerator5* c_IEnumerator5::m_new(){
	DBG_ENTER("IEnumerator.new")
	c_IEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>");
	return this;
}
void c_IEnumerator5::mark(){
	Object::mark();
}
String c_IEnumerator5::debug(){
	String t="(IEnumerator)\n";
	return t;
}
bool bb_mainClass_Debug;
int bb_graphics_DrawLine(Float t_x1,Float t_y1,Float t_x2,Float t_y2){
	DBG_ENTER("DrawLine")
	DBG_LOCAL(t_x1,"x1")
	DBG_LOCAL(t_y1,"y1")
	DBG_LOCAL(t_x2,"x2")
	DBG_LOCAL(t_y2,"y2")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<399>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<401>");
	bb_graphics_context->p_Validate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<402>");
	bb_graphics_renderDevice->DrawLine(t_x1,t_y1,t_x2,t_y2);
	return 0;
}
void bb_functions_DrawRectOutline(int t_x,int t_y,int t_w,int t_h){
	DBG_ENTER("DrawRectOutline")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_w,"w")
	DBG_LOCAL(t_h,"h")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<97>");
	t_w-=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<98>");
	t_h-=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<99>");
	bb_graphics_DrawLine(Float(t_x),Float(t_y),Float(t_x+t_w),Float(t_y));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<100>");
	bb_graphics_DrawLine(Float(t_x+t_w),Float(t_y),Float(t_x+t_w),Float(t_y+t_h));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<101>");
	bb_graphics_DrawLine(Float(t_x+t_w),Float(t_y+t_h),Float(t_x),Float(t_y+t_h));
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/functions.monkey<102>");
	bb_graphics_DrawLine(Float(t_x),Float(t_y+t_h),Float(t_x),Float(t_y));
}
int bb_graphics_DrawCircle(Float t_x,Float t_y,Float t_r){
	DBG_ENTER("DrawCircle")
	DBG_LOCAL(t_x,"x")
	DBG_LOCAL(t_y,"y")
	DBG_LOCAL(t_r,"r")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<415>");
	bb_graphics_DebugRenderDevice();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<417>");
	bb_graphics_context->p_Validate();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/mojo/graphics.monkey<418>");
	bb_graphics_renderDevice->DrawOval(t_x-t_r,t_y-t_r,t_r*FLOAT(2.0),t_r*FLOAT(2.0));
	return 0;
}
void bb_hunterClass_RenderHunter(){
	DBG_ENTER("RenderHunter")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<20>");
	c_Enumerator* t_=bb_hunterClass_hunters->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_Hunter* t_hunter=t_->p_NextObject();
		DBG_LOCAL(t_hunter,"hunter")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/hunterClass.monkey<21>");
		t_hunter->p_Render();
	}
}
int bb_bulletClass_RenderBullets(){
	DBG_ENTER("RenderBullets")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<17>");
	c_Enumerator2* t_=bb_bulletClass_bullets->p_ObjectEnumerator();
	while(t_->p_HasNext()){
		DBG_BLOCK();
		c_Bullet* t_bullet=t_->p_NextObject();
		DBG_LOCAL(t_bullet,"bullet")
		DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<18>");
		t_bullet->p_Render();
	}
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/bananas/moerin/bunnyShooter/bulletClass.monkey<20>");
	return 1;
}
c_MapValues::c_MapValues(){
	m_map=0;
}
c_MapValues* c_MapValues::m_new(c_Map7* t_map){
	DBG_ENTER("MapValues.new")
	c_MapValues *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_map,"map")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<519>");
	gc_assign(this->m_map,t_map);
	return this;
}
c_MapValues* c_MapValues::m_new2(){
	DBG_ENTER("MapValues.new")
	c_MapValues *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<516>");
	return this;
}
c_ValueEnumerator* c_MapValues::p_ObjectEnumerator(){
	DBG_ENTER("MapValues.ObjectEnumerator")
	c_MapValues *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<523>");
	c_ValueEnumerator* t_=(new c_ValueEnumerator)->m_new(m_map->p_FirstNode());
	return t_;
}
void c_MapValues::mark(){
	Object::mark();
	gc_mark_q(m_map);
}
String c_MapValues::debug(){
	String t="(MapValues)\n";
	t+=dbg_decl("map",&m_map);
	return t;
}
c_ValueEnumerator::c_ValueEnumerator(){
	m_node=0;
}
c_ValueEnumerator* c_ValueEnumerator::m_new(c_Node7* t_node){
	DBG_ENTER("ValueEnumerator.new")
	c_ValueEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_node,"node")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<481>");
	gc_assign(this->m_node,t_node);
	return this;
}
c_ValueEnumerator* c_ValueEnumerator::m_new2(){
	DBG_ENTER("ValueEnumerator.new")
	c_ValueEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<478>");
	return this;
}
bool c_ValueEnumerator::p_HasNext(){
	DBG_ENTER("ValueEnumerator.HasNext")
	c_ValueEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<485>");
	bool t_=m_node!=0;
	return t_;
}
c_TileMapTileset* c_ValueEnumerator::p_NextObject(){
	DBG_ENTER("ValueEnumerator.NextObject")
	c_ValueEnumerator *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<489>");
	c_Node7* t_t=m_node;
	DBG_LOCAL(t_t,"t")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<490>");
	gc_assign(m_node,m_node->p_NextNode());
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/monkey/map.monkey<491>");
	return t_t->m_value;
}
void c_ValueEnumerator::mark(){
	Object::mark();
	gc_mark_q(m_node);
}
String c_ValueEnumerator::debug(){
	String t="(ValueEnumerator)\n";
	t+=dbg_decl("node",&m_node);
	return t;
}
c_IEnumerator6::c_IEnumerator6(){
}
c_IEnumerator6* c_IEnumerator6::m_new(){
	DBG_ENTER("IEnumerator.new")
	c_IEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<73>");
	return this;
}
void c_IEnumerator6::mark(){
	Object::mark();
}
String c_IEnumerator6::debug(){
	String t="(IEnumerator)\n";
	return t;
}
c_ListEnumerator5::c_ListEnumerator5(){
	m_lst=0;
	m_expectedModCount=0;
	m_index=0;
	m_lastIndex=0;
}
c_ListEnumerator5* c_ListEnumerator5::m_new(c_IList5* t_lst){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>");
	c_IEnumerator6::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>");
	gc_assign(this->m_lst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>");
	m_expectedModCount=t_lst->m_modCount;
	return this;
}
c_ListEnumerator5* c_ListEnumerator5::m_new2(){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>");
	c_IEnumerator6::m_new();
	return this;
}
void c_ListEnumerator5::p_CheckConcurrency(){
	DBG_ENTER("ListEnumerator.CheckConcurrency")
	c_ListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>");
	if(m_lst->m_modCount!=m_expectedModCount){
		DBG_BLOCK();
		throw (new c_ConcurrentModificationException)->m_new(String(L"ListEnumerator.CheckConcurrency: Concurrent list modification",61),0);
	}
}
bool c_ListEnumerator5::p_HasNext(){
	DBG_ENTER("ListEnumerator.HasNext")
	c_ListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>");
	bool t_=m_index<m_lst->p_Size();
	return t_;
}
c_TileMapTile* c_ListEnumerator5::p_NextObject(){
	DBG_ENTER("ListEnumerator.NextObject")
	c_ListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>");
	c_TileMapTile* t_=m_lst->p_Get2(m_lastIndex);
	return t_;
}
void c_ListEnumerator5::mark(){
	c_IEnumerator6::mark();
	gc_mark_q(m_lst);
}
String c_ListEnumerator5::debug(){
	String t="(ListEnumerator)\n";
	t=c_IEnumerator6::debug()+t;
	t+=dbg_decl("lst",&m_lst);
	t+=dbg_decl("lastIndex",&m_lastIndex);
	t+=dbg_decl("index",&m_index);
	t+=dbg_decl("expectedModCount",&m_expectedModCount);
	return t;
}
c_ArrayListEnumerator5::c_ArrayListEnumerator5(){
	m_alst=0;
}
c_ArrayListEnumerator5* c_ArrayListEnumerator5::m_new(c_ArrayList5* t_lst){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>");
	c_ListEnumerator5::m_new(t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>");
	gc_assign(this->m_alst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>");
	m_expectedModCount=m_alst->m_modCount;
	return this;
}
c_ArrayListEnumerator5* c_ArrayListEnumerator5::m_new2(){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>");
	c_ListEnumerator5::m_new2();
	return this;
}
bool c_ArrayListEnumerator5::p_HasNext(){
	DBG_ENTER("ArrayListEnumerator.HasNext")
	c_ArrayListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>");
	bool t_=m_index<m_alst->m_size;
	return t_;
}
c_TileMapTile* c_ArrayListEnumerator5::p_NextObject(){
	DBG_ENTER("ArrayListEnumerator.NextObject")
	c_ArrayListEnumerator5 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>");
	c_TileMapTile* t_=dynamic_cast<c_TileMapTile*>(m_alst->m_elements.At(m_lastIndex));
	return t_;
}
void c_ArrayListEnumerator5::mark(){
	c_ListEnumerator5::mark();
	gc_mark_q(m_alst);
}
String c_ArrayListEnumerator5::debug(){
	String t="(ArrayListEnumerator)\n";
	t=c_ListEnumerator5::debug()+t;
	t+=dbg_decl("alst",&m_alst);
	return t;
}
c_ListEnumerator6::c_ListEnumerator6(){
	m_lst=0;
	m_expectedModCount=0;
	m_index=0;
	m_lastIndex=0;
}
c_ListEnumerator6* c_ListEnumerator6::m_new(c_IList6* t_lst){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<147>");
	c_IEnumerator5::m_new();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<148>");
	gc_assign(this->m_lst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<149>");
	m_expectedModCount=t_lst->m_modCount;
	return this;
}
c_ListEnumerator6* c_ListEnumerator6::m_new2(){
	DBG_ENTER("ListEnumerator.new")
	c_ListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<133>");
	c_IEnumerator5::m_new();
	return this;
}
void c_ListEnumerator6::p_CheckConcurrency(){
	DBG_ENTER("ListEnumerator.CheckConcurrency")
	c_ListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<142>");
	if(m_lst->m_modCount!=m_expectedModCount){
		DBG_BLOCK();
		throw (new c_ConcurrentModificationException)->m_new(String(L"ListEnumerator.CheckConcurrency: Concurrent list modification",61),0);
	}
}
bool c_ListEnumerator6::p_HasNext(){
	DBG_ENTER("ListEnumerator.HasNext")
	c_ListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<155>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<156>");
	bool t_=m_index<m_lst->p_Size();
	return t_;
}
c_TileMapLayer* c_ListEnumerator6::p_NextObject(){
	DBG_ENTER("ListEnumerator.NextObject")
	c_ListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<167>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<168>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<169>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<170>");
	c_TileMapLayer* t_=m_lst->p_Get2(m_lastIndex);
	return t_;
}
void c_ListEnumerator6::mark(){
	c_IEnumerator5::mark();
	gc_mark_q(m_lst);
}
String c_ListEnumerator6::debug(){
	String t="(ListEnumerator)\n";
	t=c_IEnumerator5::debug()+t;
	t+=dbg_decl("lst",&m_lst);
	t+=dbg_decl("lastIndex",&m_lastIndex);
	t+=dbg_decl("index",&m_index);
	t+=dbg_decl("expectedModCount",&m_expectedModCount);
	return t;
}
c_ArrayListEnumerator6::c_ArrayListEnumerator6(){
	m_alst=0;
}
c_ArrayListEnumerator6* c_ArrayListEnumerator6::m_new(c_ArrayList6* t_lst){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_LOCAL(t_lst,"lst")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<220>");
	c_ListEnumerator6::m_new(t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<221>");
	gc_assign(this->m_alst,t_lst);
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<222>");
	m_expectedModCount=m_alst->m_modCount;
	return this;
}
c_ArrayListEnumerator6* c_ArrayListEnumerator6::m_new2(){
	DBG_ENTER("ArrayListEnumerator.new")
	c_ArrayListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<213>");
	c_ListEnumerator6::m_new2();
	return this;
}
bool c_ArrayListEnumerator6::p_HasNext(){
	DBG_ENTER("ArrayListEnumerator.HasNext")
	c_ArrayListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<228>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<229>");
	bool t_=m_index<m_alst->m_size;
	return t_;
}
c_TileMapLayer* c_ArrayListEnumerator6::p_NextObject(){
	DBG_ENTER("ArrayListEnumerator.NextObject")
	c_ArrayListEnumerator6 *self=this;
	DBG_LOCAL(self,"Self")
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<234>");
	p_CheckConcurrency();
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<235>");
	m_lastIndex=m_index;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<236>");
	m_index+=1;
	DBG_INFO("C:/Users/Seb/Documents/Programmation/Monkey/modules/diddy/collections.monkey<237>");
	c_TileMapLayer* t_=dynamic_cast<c_TileMapLayer*>(m_alst->m_elements.At(m_lastIndex));
	return t_;
}
void c_ArrayListEnumerator6::mark(){
	c_ListEnumerator6::mark();
	gc_mark_q(m_alst);
}
String c_ArrayListEnumerator6::debug(){
	String t="(ArrayListEnumerator)\n";
	t=c_ListEnumerator6::debug()+t;
	t+=dbg_decl("alst",&m_alst);
	return t;
}
int bbInit(){
	GC_CTOR
	bb_reflection__classesMap=0;
	DBG_GLOBAL("_classesMap",&bb_reflection__classesMap);
	bb_reflection__classes=Array<c_ClassInfo* >();
	DBG_GLOBAL("_classes",&bb_reflection__classes);
	bb_reflection__getClass=0;
	DBG_GLOBAL("_getClass",&bb_reflection__getClass);
	bb_reflection__boolClass=0;
	DBG_GLOBAL("_boolClass",&bb_reflection__boolClass);
	bb_reflection__intClass=0;
	DBG_GLOBAL("_intClass",&bb_reflection__intClass);
	bb_reflection__floatClass=0;
	DBG_GLOBAL("_floatClass",&bb_reflection__floatClass);
	bb_reflection__stringClass=0;
	DBG_GLOBAL("_stringClass",&bb_reflection__stringClass);
	bb_reflection__functions=Array<c_FunctionInfo* >();
	DBG_GLOBAL("_functions",&bb_reflection__functions);
	bb_reflection__init=bb_reflection___init();
	DBG_GLOBAL("_init",&bb_reflection__init);
	bb_app__app=0;
	DBG_GLOBAL("_app",&bb_app__app);
	bb_app__delegate=0;
	DBG_GLOBAL("_delegate",&bb_app__delegate);
	bb_app__game=BBGame::Game();
	DBG_GLOBAL("_game",&bb_app__game);
	bb_framework_diddyGame=0;
	DBG_GLOBAL("diddyGame",&bb_framework_diddyGame);
	bb_reflection__unknownClass=((new c_UnknownClass)->m_new());
	DBG_GLOBAL("_unknownClass",&bb_reflection__unknownClass);
	bb_graphics_device=0;
	DBG_GLOBAL("device",&bb_graphics_device);
	bb_graphics_context=(new c_GraphicsContext)->m_new();
	DBG_GLOBAL("context",&bb_graphics_context);
	c_Image::m_DefaultFlags=0;
	DBG_GLOBAL("DefaultFlags",&c_Image::m_DefaultFlags);
	bb_audio_device=0;
	DBG_GLOBAL("device",&bb_audio_device);
	bb_input_device=0;
	DBG_GLOBAL("device",&bb_input_device);
	bb_graphics_renderDevice=0;
	DBG_GLOBAL("renderDevice",&bb_graphics_renderDevice);
	bb_framework_DEVICE_WIDTH=FLOAT(.0);
	DBG_GLOBAL("DEVICE_WIDTH",&bb_framework_DEVICE_WIDTH);
	bb_framework_DEVICE_HEIGHT=FLOAT(.0);
	DBG_GLOBAL("DEVICE_HEIGHT",&bb_framework_DEVICE_HEIGHT);
	bb_framework_SCREEN_WIDTH=FLOAT(.0);
	DBG_GLOBAL("SCREEN_WIDTH",&bb_framework_SCREEN_WIDTH);
	bb_framework_SCREEN_HEIGHT=FLOAT(.0);
	DBG_GLOBAL("SCREEN_HEIGHT",&bb_framework_SCREEN_HEIGHT);
	bb_framework_SCREEN_WIDTH2=FLOAT(.0);
	DBG_GLOBAL("SCREEN_WIDTH2",&bb_framework_SCREEN_WIDTH2);
	bb_framework_SCREEN_HEIGHT2=FLOAT(.0);
	DBG_GLOBAL("SCREEN_HEIGHT2",&bb_framework_SCREEN_HEIGHT2);
	bb_framework_SCREENX_RATIO=FLOAT(1.0);
	DBG_GLOBAL("SCREENX_RATIO",&bb_framework_SCREENX_RATIO);
	bb_framework_SCREENY_RATIO=FLOAT(1.0);
	DBG_GLOBAL("SCREENY_RATIO",&bb_framework_SCREENY_RATIO);
	bb_random_Seed=1234;
	DBG_GLOBAL("Seed",&bb_random_Seed);
	bb_framework_dt=0;
	DBG_GLOBAL("dt",&bb_framework_dt);
	bb_app__updateRate=0;
	DBG_GLOBAL("_updateRate",&bb_app__updateRate);
	c_Particle::m_MAX_PARTICLES=800;
	DBG_GLOBAL("MAX_PARTICLES",&c_Particle::m_MAX_PARTICLES);
	c_Particle::m_particles=Array<c_Particle* >(c_Particle::m_MAX_PARTICLES);
	DBG_GLOBAL("particles",&c_Particle::m_particles);
	c_FPSCounter::m_startTime=0;
	DBG_GLOBAL("startTime",&c_FPSCounter::m_startTime);
	c_FPSCounter::m_fpsCount=0;
	DBG_GLOBAL("fpsCount",&c_FPSCounter::m_fpsCount);
	c_FPSCounter::m_totalFPS=0;
	DBG_GLOBAL("totalFPS",&c_FPSCounter::m_totalFPS);
	c_SoundPlayer::m_channel=0;
	DBG_GLOBAL("channel",&c_SoundPlayer::m_channel);
	c_SoundBank::m_path=String(L"sounds/",7);
	DBG_GLOBAL("path",&c_SoundBank::m_path);
	bb_framework_defaultFadeTime=FLOAT(600.0);
	DBG_GLOBAL("defaultFadeTime",&bb_framework_defaultFadeTime);
	c_JsonString::m__null=(new c_JsonString)->m_new(String());
	DBG_GLOBAL("_null",&c_JsonString::m__null);
	c_JsonNumber::m__zero=(new c_JsonNumber)->m_new(String(L"0",1));
	DBG_GLOBAL("_zero",&c_JsonNumber::m__zero);
	c_JsonBool::m__true=(new c_JsonBool)->m_new(true);
	DBG_GLOBAL("_true",&c_JsonBool::m__true);
	c_JsonBool::m__false=(new c_JsonBool)->m_new(false);
	DBG_GLOBAL("_false",&c_JsonBool::m__false);
	c_JsonNull::m__instance=(new c_JsonNull)->m_new();
	DBG_GLOBAL("_instance",&c_JsonNull::m__instance);
	bb_mainClass_titleScreen=0;
	DBG_GLOBAL("titleScreen",&bb_mainClass_titleScreen);
	bb_mainClass_gameScreen=0;
	DBG_GLOBAL("gameScreen",&bb_mainClass_gameScreen);
	bb_base64_BASE64_ARRAY=Array<int >();
	DBG_GLOBAL("BASE64_ARRAY",&bb_base64_BASE64_ARRAY);
	bb_bulletClass_bullets=(new c_List)->m_new();
	DBG_GLOBAL("bullets",&bb_bulletClass_bullets);
	bb_hunterClass_hunters=(new c_List2)->m_new();
	DBG_GLOBAL("hunters",&bb_hunterClass_hunters);
	bb_mainClass_Debug=true;
	DBG_GLOBAL("Debug",&bb_mainClass_Debug);
	return 0;
}
void gc_mark(){
	gc_mark_q(bb_reflection__classesMap);
	gc_mark_q(bb_reflection__classes);
	gc_mark_q(bb_reflection__getClass);
	gc_mark_q(bb_reflection__boolClass);
	gc_mark_q(bb_reflection__intClass);
	gc_mark_q(bb_reflection__floatClass);
	gc_mark_q(bb_reflection__stringClass);
	gc_mark_q(bb_reflection__functions);
	gc_mark_q(bb_app__app);
	gc_mark_q(bb_app__delegate);
	gc_mark_q(bb_framework_diddyGame);
	gc_mark_q(bb_reflection__unknownClass);
	gc_mark_q(bb_graphics_device);
	gc_mark_q(bb_graphics_context);
	gc_mark_q(bb_audio_device);
	gc_mark_q(bb_input_device);
	gc_mark_q(bb_graphics_renderDevice);
	gc_mark_q(bb_framework_dt);
	gc_mark_q(c_Particle::m_particles);
	gc_mark_q(c_JsonString::m__null);
	gc_mark_q(c_JsonNumber::m__zero);
	gc_mark_q(c_JsonBool::m__true);
	gc_mark_q(c_JsonBool::m__false);
	gc_mark_q(c_JsonNull::m__instance);
	gc_mark_q(bb_mainClass_titleScreen);
	gc_mark_q(bb_mainClass_gameScreen);
	gc_mark_q(bb_base64_BASE64_ARRAY);
	gc_mark_q(bb_bulletClass_bullets);
	gc_mark_q(bb_hunterClass_hunters);
}
//${TRANSCODE_END}

int main( int argc,const char *argv[] ){

	BBMonkeyGame::Main( argc,argv );
}
