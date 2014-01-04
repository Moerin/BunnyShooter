Strict

Import gameClasses

Class Bonus
	Field x:Floats
	Field y:Float
	Field width:Float
	Field height:Float
	
	Method Init:Void()
		x = Rnd(30, 610)
		y = Rnd(30, 450)
		width = 5
		height = 5
	End
		
	Method CheckCollision:Void(bunny:Bunny)
		If x + width > bunny.GetXpos() And x < bunny.GetXpos() +bunny.GetWidth() And y + height < bunny.GetYpos() and y < bunny.GetYpos() +bunny.GetHeight() 'TODO finir ici
			
		Endif
	End
End