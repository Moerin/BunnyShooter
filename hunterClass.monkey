Strict

Import gameClasses

Global hunters:= New List<Hunter>

Function CreateHunter:Void()
	Local h:= New Hunter()
	'h.Init()
	hunters.AddLast(h)
End

Function UpdateHunter:Void(tx:Float, ty:float)
	For Local hunter := EachIn hunters
		hunter.Update(tx, ty)
	Next
End

Function RenderHunter:Void()
	For Local hunter:= EachIn hunters
		hunter.Draw()
	Next
End

Function RemoveHunter:Void()
	hunters.Clear
End

Class Hunter Extends Sprite
	Field sx:Float
	Field sy:Float
'	Field cx:Float
'	Field cy:Float
	Field dx:Float
	Field dy:Float
	Field speed:Float
	Field dist:float
	Field height:int = 40 'note: TODO: Change size by image size
	Field width:int = 15
	Field dt:DeltaTimer
	
	'Atlas
	Field hunterImage:GameImage
	
	Method New()
		Local position:Int
		position = Rnd(1, 5)
		Select position
			Case 1
				sx = Rnd(0, 641)
				sy = 0
			Case 2
				sx = Rnd(0, 641)
				sy = SCREEN_HEIGHT
			Case 3
				sx = 0
				sy = Rnd(0, 481)
			Case 4
				sx = SCREEN_WIDTH
				sy = Rnd(0, 481)
		End
		Self.x = sx
		Self.y = sy
		speed = Rnd(500, 600)
		dt = New DeltaTimer(60)
		
		Self.visible = True
		' Hunter Sprite
		hunterImage = diddyGame.images.FindSet("hunter_full0", 40, 50, 11)
		SetFrame(0, 11, 125, False, True)
	End
	
	Method Update:Void(tx:int, ty:int)
		UpdateAnimation()
		dt.UpdateDelta()
		dx = tx - sx
		dy = ty - sy
		x += (dx / speed) * dt.delta
		y += (dy / speed) * dt.delta
		CheckCollision()
	End
	
	Method Draw:Void()
		hunterImage.Draw(x, y)
'		SetColor(0, 0, 0)
'		DrawRect(cx, cy, width, height)
'		DrawText(dist, 10, 10)
'		SetColor(255, 0, 0)
'		DrawCircle(cx, cy, 3)
'		DrawCircle(cx + width, cy, 3)
'		DrawCircle(cx + width, cy + height, 3)
'		DrawCircle(cx, cy + height, 3)
	End
	
	Method GetXpos:Float()
		Return x
	End
	
	Method GetYpos:Float()
		Return y
	End
	
	Method GetWidth:Int()
		Return width
	End
	
	Method GetHeight:int()
		Return height
	End

	Method CheckCollision:Void()
		For Local bullet:= EachIn bullets
			If bullet.GetXpos() +bullet.GetRadius() / 2 > x And bullet.GetXpos() -bullet.GetRadius() / 2 < x + width and bullet.GetYpos() +bullet.GetRadius() / 2 > y and bullet.GetYpos() -bullet.GetRadius() / 2 < y + height Then
				hunters.Remove(Self)
				bullets.Remove(bullet)
				Print("Hunter killed")
				gameScreen.score += 100
			endif
		Next
	End
End