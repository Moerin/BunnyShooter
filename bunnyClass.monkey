Strict

Import gameClasses

Class Bunny Extends Sprite
'	Field xPos:Float
'	Field yPos:float
	Field speed:Float = 4.0
	Field health:int = 3
	Field isDead:bool = False
	Field bCount:int
	Field bWidth:Int = 15
	Field bHeight:Int = 25
	Field beWidth:int = 2
	Field beHeight:int = -9
	Field flickering:bool
	Field flTimer:float
	
	Const UP:Int = 1
	Const DOWN:Int = 2
	Const LEFT:Int = 3
	Const RIGHT:Int = 4
	Field direction:Int = 0
	
	' Atlas part
	Field walkImagesTop:GameImage
	Field walkImagesBottom:GameImage
	Field walkImagesRight:GameImage
	Field walkImagesLeft:GameImage
	Field standImage:GameImage
	Field deadImages:GameImage
	Field turningImages:GameImage
	
	Method New(img:GameImage, x:float, y:float, bAmount:int)
		Self.image = img
'		xPos = x
'		yPos = y
		Self.x = x
		Self.y = y
		
		bCount = bAmount
		flTimer = Millisecs()
		'note: PENDING: HitBox wrong size
		Self.SetHitBox(-img.w2 + 17, -img.h2, 32, 32)
		Self.visible = True
		direction = DOWN
		
		' Atlas part
		walkImagesTop = diddyGame.images.FindSet("bunny_top", 32, 32, 2)
		walkImagesBottom = diddyGame.images.FindSet("bunny_bottom", 32, 32, 2)
		walkImagesRight = diddyGame.images.FindSet("bunny_right", 32, 32, 2)
		walkImagesLeft = diddyGame.images.FindSet("bunny_left", 32, 32, 2)
		standImage = diddyGame.images.Find("bunny_bottom")
	End
	
	Method Update:Void()
		If KeyDown(KEY_W)
			y -= speed
			direction = UP
			image = walkImagesTop
			SetFrame(0, 1, 50)
		EndIf
		If KeyDown(KEY_S)
			y += speed
			direction = DOWN
			direction = UP
			image = walkImagesDown
			SetFrame(0, 1, 50)
		EndIf
		If KeyDown(KEY_A)
			x -= speed
			direction = LEFT
		EndIf
		If KeyDown(KEY_D)
			x += speed
			direction = RIGHT
		EndIf
		
		'note: TODO: Rabbit can't shoot backward
		If MouseHit(0) and bCount > 0 Then
			CreateBullet(MouseX(), MouseY(), x, y)
			bCount -= 1
		EndIf
		
		If x < 0 Then
			x = 0
		EndIf
		If x > SCREEN_WIDTH - 15 Then
			x = SCREEN_WIDTH - 15
		EndIf
		If y < 9 Then
			y = 9
		EndIf
		If y > SCREEN_HEIGHT - 25 Then
			y = SCREEN_HEIGHT - 25
		EndIf
		
		'Reload
		If bCount <= 0 And KeyHit(KEY_R) Then
			bCount = 10
		EndIf
		
		'Collision checking
		CheckCollision()
		
		'Set bunny to death
		If health <= 0 and isDead = False Then
			isDead = True
		EndIf
		
		If flickering = True Then
			If Millisecs() -flTimer > 3000 Then
				flickering = False
				flTimer = Millisecs()
			EndIf
		EndIf
		UpdateAnimation()
	End
	
	Method Draw:Void()
		If Debug Then
			DrawHitBox()
		EndIf
		'if bunny is alive do normal stuff
		If isDead = False Then
			'note: TODO: Add flickering sprite
			'Flickering
'			If flickering = True Then
'				SetColor(Rnd(0, 256), Rnd(0, 256), Rnd(0, 256))
'			Else
'				SetColor(255, 255, 255)
'			EndIf
			' Rect for bunny test
'			DrawRect(x, y, 15, 25)
'			DrawRect(x, y, beWidth, beHeight)
'			DrawRect(x + 15 - 2, y, beWidth, beHeight)
			
			image.Draw(x, y)

'			If direction = UP Then
'				walkImagesTop.Draw(x, y)
'			ElseIf direction = DOWN Then
'				walkImagesBottom.Draw(x, y)
'			ElseIf direction = LEFT Then
'				walkImagesLeft.Draw(x, y)
'			ElseIf direction = RIGHT Then
'				walkImagesRight.Draw(x, y)
'			EndIf
			
			'note: TODO: Add bullet Sprite and draw gun
			'Bullets
			SetColor(255, 255, 255)
			Local xdiff:int = bCount * 3 / 2
			If bCount > 0 Then
				For Local x:Int = 0 To bCount - 1
					DrawRect(20 + x * 5, SCREEN_HEIGHT - 50, 3, 15)
				Next
			EndIf
			If bCount <= 0 Then
				SetColor(255, 0, 0)
				DrawText("Reload!", SCREEN_WIDTH / 2 - 3, SCREEN_HEIGHT / 2)
			EndIf
			
			'Health
			If health > 0 Then
				For Local x:Int = 0 To health - 1
					SetColor(0, 255, 0)
					DrawRect(550 + x * 15, SCREEN_HEIGHT - 50, 15, 15)
				Next
			EndIf
		EndIf
		
		'note: TODO: Add Rabbit Dead sprite
		' RIP
		If isDead Then
			SetColor(255, 0, 0)
			DrawCircle(x, y + bWidth * 2, 10)
			SetColor(255, 255, 255)
			DrawRect(x - bWidth, y + bWidth, bHeight, bWidth)
			DrawRect(x - bWidth, y + bWidth, beHeight, beWidth)
			DrawRect(x - bWidth, y + bWidth * 2 - beWidth, beHeight, beWidth)
			SetColor(255, 0, 0)
			DrawLine(x - bWidth / 2, y + (bWidth * 2) , x - bWidth / 2, y + bWidth + 4)
		EndIf
		
	End
	
	Method CheckCollision:Void() 'TODO collision make 2 hit non 1
		For Local h:= EachIn hunters
			If h.GetXpos() +h.GetWidth() > x and h.GetXpos() < x + 15 and h.GetYpos() +h.GetHeight() > y and h.GetYpos() < y + 25 And flickering = False Then
				Print("hit")
				health -= 1
				flickering = True
			EndIf
		Next
	End
	
	Method GetHealth:Int()
		Return health
	End
	
	Method SetHealth:Int(newHealth:int)
		health = newHealth
	End
	
	Method GetXpos:Int()
		Return x
	End
	
	Method GetYpos:Int()
		Return y
	End
	
	Method GetWidth:Int()
		Return bWidth
	End
	
	Method GetHeight:Int()
		Return bHeight
	End	
	
	#Rem
		Comment with the olds field position instead the new one which use from the Sprite class from Diddy
	#END
	
'	Method Update:Void()
'		If KeyDown(KEY_W)
'			yPos -= speed
'			direction = UP
'		EndIf
'		If KeyDown(KEY_S)
'			yPos += speed
'			direction = DOWN
'		EndIf
'		If KeyDown(KEY_A)
'			xPos -= speed
'			direction = LEFT
'		EndIf
'		If KeyDown(KEY_D)
'			xPos += speed
'			direction = DOWN
'		EndIf
'		
'		'note: TODO: Rabbit can't shoot backward
'		If MouseHit(0) and bCount > 0 Then
'			CreateBullet(MouseX(), MouseY(), xPos, yPos)
'			bCount -= 1
'		EndIf
'		
'		If xPos < 0 Then
'			xPos = 0
'		EndIf
'		If xPos > SCREEN_WIDTH - 15 Then
'			xPos = SCREEN_WIDTH - 15
'		EndIf
'		If yPos < 9 Then
'			yPos = 9
'		EndIf
'		If yPos > SCREEN_HEIGHT - 25 Then
'			yPos = SCREEN_HEIGHT - 25
'		EndIf
'		
'		'Reload
'		If bCount <= 0 And KeyHit(KEY_R) Then
'			bCount = 10
'		EndIf
'		
'		'Collision checking
'		CheckCollision()
'		
'		'Set bunny to death
'		If health <= 0 and isDead = False Then
'			isDead = True
'		EndIf
'		
'		If flickering = True Then
'			If Millisecs() -flTimer > 3000 Then
'				flickering = False
'				flTimer = Millisecs()
'			EndIf
'		EndIf
'	End
'	
'	Method Draw:Void()
'		'if bunny is alive do normal stuff
'		If isDead = False Then
'		
'			'note: TODO: Add flickering sprite
'			'Flickering
''			If flickering = True Then
''				SetColor(Rnd(0, 256), Rnd(0, 256), Rnd(0, 256))
''			Else
''				SetColor(255, 255, 255)
''			EndIf
'			' Rect for bunny test
''			DrawRect(xPos, yPos, 15, 25)
''			DrawRect(xPos, yPos, beWidth, beHeight)
''			DrawRect(xPos + 15 - 2, yPos, beWidth, beHeight)
'			
'			If direction = UP Then
'				walkImagesTop.Draw(xPos, yPos)
'			ElseIf direction = DOWN Then
'				walkImagesBottom.Draw(xPos, yPos)
'			ElseIf direction = LEFT Then
'				walkImagesLeft.Draw(xPos, yPos)
'			ElseIf direction = RIGHT Then
'				walkImagesRight.Draw(xPos, yPos)
'			EndIf
'			
'			'note: TODO: Add bullet Sprite and draw gun
'			'Bullets
'			SetColor(255, 255, 255)
'			Local xdiff:int = bCount * 3 / 2
'			If bCount > 0 Then
'				For Local x:Int = 0 To bCount - 1
'					DrawRect(20 + x * 5, SCREEN_HEIGHT - 50, 3, 15)
'				Next
'			EndIf
'			If bCount <= 0 Then
'				SetColor(255, 0, 0)
'				DrawText("Reload!", SCREEN_WIDTH / 2 - 3, SCREEN_HEIGHT / 2)
'			EndIf
'			
'			'Health
'			If health > 0 Then
'				For Local x:Int = 0 To health - 1
'					SetColor(0, 255, 0)
'					DrawRect(550 + x * 15, SCREEN_HEIGHT - 50, 15, 15)
'				Next
'			EndIf
'		EndIf
'		
'		'note: TODO: Add Rabbit Dead sprite
'		' RIP
'		If isDead Then
'			SetColor(255, 0, 0)
'			DrawCircle(xPos, yPos + bWidth * 2, 10)
'			SetColor(255, 255, 255)
'			DrawRect(xPos - bWidth, yPos + bWidth, bHeight, bWidth)
'			DrawRect(xPos - bWidth, yPos + bWidth, beHeight, beWidth)
'			DrawRect(xPos - bWidth, yPos + bWidth * 2 - beWidth, beHeight, beWidth)
'			SetColor(255, 0, 0)
'			DrawLine(xPos - bWidth / 2, yPos + (bWidth * 2) , xPos - bWidth / 2, yPos + bWidth + 4)
'		EndIf
'		
'	End
'	
'	Method CheckCollision:Void() 'TODO collision make 2 hit non 1
'		For Local h:= EachIn hunters
'			If h.GetXpos() +h.GetWidth() > xPos and h.GetXpos() < xPos + 15 and h.GetYpos() +h.GetHeight() > yPos and h.GetYpos() < yPos + 25 And flickering = False Then
'				Print("hit")
'				health -= 1
'				flickering = True
'			EndIf
'		Next
'	End
'	
'	Method GetHealth:Int()
'		Return health
'	End
'	
'	Method SetHealth:Int(newHealth:int)
'		health = newHealth
'	End
'	
'	Method GetXpos:Int()
'		Return xPos
'	End
'	
'	Method GetYpos:Int()
'		Return yPos
'	End
'	
'	Method GetWidth:Int()
'		Return bWidth
'	End
'	
'	Method GetHeight:Int()
'		Return bHeight
'	End	
End