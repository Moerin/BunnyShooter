Strict

Import gameClasses

Function SpwanShoot:Void()
	
End

Class Bunny
	Field xPos:Float
	Field yPos:float
	Field speed:Float = 4.0
	Field health:int = 3
	Field dead:bool = False
	Field shoot:Shoot
	Field direction:int
	
	Const facingRight:int = 1
	Const facingLeft:int = 2
	Const facingUp:int = 3
	Const facingDown:int = 4
	
	
	Method New(x:float, y:float)
		xPos = x
		yPos = y
	End
	
	Method Update:Void()
		If KeyDown(KEY_UP)
			yPos -= speed
			direction = facingUp
		EndIf
		If KeyDown(KEY_DOWN)
			yPos += speed
			direction = facingDown
		EndIf
		If KeyDown(KEY_LEFT)
			xPos -= speed
			direction = facingLeft
		EndIf
		If KeyDown(KEY_RIGHT)
			xPos += speed
			direction = facingRight
		EndIf
		
		If KeyHit(KEY_S) Then
			shoot = New Shoot(xPos, yPos, direction)
			shoot.Update()
		EndIf
		
		If xPos < 0 Then
			xPos = 0
		EndIf
		If xPos > SCREEN_WIDTH - 15 Then
			xPos = SCREEN_WIDTH - 15
		EndIf
		If yPos < 9 Then
			yPos = 9
		EndIf
		If yPos > SCREEN_HEIGHT - 25 Then
			yPos = SCREEN_HEIGHT - 25
		EndIf
	End
	
	Method Draw:Void()
		SetColor(255, 255,255)
		DrawRect(xPos, yPos, 15, 25)
		DrawRect(xPos, yPos, 2, -9)
		DrawRect(xPos + 15 - 2, yPos, 2, -9)
		'Super.Draw()
	End
	
	Method GetHealth:Int()
		Return health
	End
	
	Method SetHealth:Int(newHealth:int)
		health = newHealth
	End

End