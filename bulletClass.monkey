Strict

Import gameClasses

Global bullets:= New List < Bullet>

'-------------------------------------------------
Function UpdateBullets:Int()
	For Local bullet:= EachIn bullets
		bullet.Update()
	Next
	Return True
End

'-------------------------------------------------
Function RenderBullets:Int()
	For Local bullet:= EachIn bullets
		bullet.Render()
	Next
	Return True
End

'-------------------------------------------------
Function CreateBullet:Int(mx:Int, my:Int, xp:Int, yp:int)
	Local b:= New Bullet
	b.Init(mx, my, xp, yp)
	bullets.AddLast(b)
	Return True
End

'-------------------------------------------------
Function RemoveBullets:Int()
	bullets.Clear()
	Return True
End

Function GetDistance:int(tx:Int, ty:Int, sx:Int, sy:int)
	Local diffx:Int, diffy:Int
	diffx = tx - sx
	diffy = ty - sy
	Return Sqrt( (diffx * diffx) + (diffy * diffy))
End

Class Bullet
	Field sx:Float = 0.0		'x start pos
	Field sy:Float = 0.0		'y start pos
	Field tx:Float = 0.0		'x target pos
	Field ty:Float = 0.0		'y target pos
	Field cx:Float = 0.0		'x current pos
	Field cy:Float = 0.0		'y current pos
	Field dx:Float = 0.0		'x difference
	Field dy:Float = 0.0		'y difference
	Field speed:Float = 0.0 	'speed factor
	Field radius:Float = 5
	Field dt:DeltaTimer
	
	Method Init:Void(x:Float, y:Float, xp:int, yp:int)
		sx = xp
		sy = yp
		tx = x
		ty = y
		cx = xp
		cy = yp
		dx = tx - sx
		dy = ty - sy
		speed = GetDistance(tx, ty, sx, sy) / 4.0
		dt = New DeltaTimer(60)
	End
	
	Method Update:Void()
		dt.UpdateDelta()
		cx += (dx / speed) * dt.delta
		cy += (dy / speed) * dt.delta
	End
	
	Method Render:Void()
		SetColor(255, 0, 0)
		DrawCircle(cx, cy, radius)
	End
	
	Method GetXpos:Float()
		Return cx
	End
	
	Method GetYpos:Float()
		Return cy
	End
	
	Method GetRadius:Float()
		Return radius
	End
	
End