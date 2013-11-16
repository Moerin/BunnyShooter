Strict

Import gameClasses

Class Shoot
	Field xPos:Float
	Field yPos:Float
	Field Speed:Float = 20
	Field shootDir:int
	
	Method New(x:Float, y:Float, facing:int)
		xPos = x
		yPos = y
		shootDir = facing
	End
	
	Method Update:Void()
		Select shootDir
			Case 1 'right
				xPos += 20.0
				If xPos > 400 Then
					Print("Disparait")
				EndIf
			Case 2 'left
				xPos -= 20.0
				If xPos < 0 Then
					Print("Disparait")
				EndIf
			Case 3
				yPos += 20.0
				If yPos > 400 Then
					Print("Disparait")
				EndIf
			Case 4
				yPos -= 20.0
				If yPos < 0 Then
					Print("Disparait")
				EndIf
		End
		Self.Draw()
	End
	
	Method Draw:Void()
		SetColor(255, 0, 0)
		DrawCircle(xPos, yPos, 5)
	End
	
End