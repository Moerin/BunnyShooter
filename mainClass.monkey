Strict

Import gameClasses

Global titleScreen:TitleScreen
Global gameScreen:GameScreen
Global Debug:Bool = True

Class Game Extends DiddyApp
	Method OnCreate:Int()
		Super.OnCreate()
		
		LoadImages()
		
		titleScreen = New TitleScreen
		gameScreen = New GameScreen
		titleScreen.PreStart()
		Return 0
	End
	
	Method LoadImages:Void()
		' create tmpImage for animations
		Local tmpImage:Image
		' load sparrow atlas sprites
		images.LoadAtlas("bunny_character.xml", images.SPARROW_ATLAS)
		images.LoadAtlas("hunter_character.xml", images.SPARROW_ATLAS)
	End
End

Class TitleScreen Extends Screen

	Method New()
		name = "Title"
	End
	
	Method Start:Void()
	
	End
	
	Method Render:Void()
		Cls
		DrawText "Bunny Shooter!", SCREEN_WIDTH2, SCREEN_HEIGHT2, 0.5, 0.5
		DrawText "Escape to Quit!", SCREEN_WIDTH2, SCREEN_HEIGHT2 + 40, 0.5, 0.5
		DrawText "Enter to Play!", SCREEN_WIDTH2, SCREEN_HEIGHT2 + 80, 0.5, 0.5
		FPSCounter.Draw(0, 0)
	End
	
	Method Update:Void()
		If KeyHit(KEY_ESCAPE)
			FadeToScreen(Null)
		EndIf
		If KeyHit(KEY_ENTER)
			FadeToScreen(gameScreen)
		EndIf
	End
End

Class GameScreen Extends Screen
	Field bunny:Bunny
	Field currentTime:int
	Field score:int
	Field gameOver:Bool
'	Field createdImage:Image  'For local image creation
	Field backgroundImage:Image
	Field tilemap:MyTileMap

	
	Method New()
		name = "Gameplay"
	End
	
	Method Start:Void()
		'note TODO: Find how are managed collision with tile
		'Level tile
		Local reader:MyTiledTileMapReader = New MyTiledTileMapReader
		Local tm:TileMap = reader.LoadMap("levels/map.tmx")
		tilemap = MyTileMap(tm)
		' Atlas image method
		bunny = New Bunny(diddyGame.images.Find("bunny_bottom"), SCREEN_HEIGHT2, SCREEN_WIDTH2, 10)
		currentTime = Millisecs()
		score = 0
		gameOver = False
	End
	
	Method Update:Void()
		If gameOver Then Return
		bunny.Update() 									'Player update
		UpdateBullets()									'Bullet Update
		If Millisecs() -currentTime > 1000 Then 		'Create hunter every 1s
			CreateHunter()
			currentTime = Millisecs()
		EndIf
		
		' Create an image by press KEY_1
'		If KeyHit(KEY_1)
'			Local gi:GameImage = diddyGame.images.Find("bunny_bottom")
'			createdImage = CreateImage(gi.image.Width(), gi.image.Height())
'			createdImage.WritePixels(gi.Pixels, 0, 0, createdImage.Width(), createdImage.Height())
'		End
		
		UpdateHunter(bunny.GetXpos(), bunny.GetYpos())	'Update Hunter
		
		If bunny.GetHealth() <= 0 and gameOver = False Then
			gameOver = True			
			FadeToScreen(titleScreen)
			RemoveBullets()
			RemoveHunter()
		EndIf
	End
	
	Method Render:Void()
		Cls
		tilemap.RenderMap(diddyGame.scrollX, diddyGame.scrollY, SCREEN_WIDTH, SCREEN_HEIGHT)
		bunny.Draw()
		' local image creation
'		If createdImage
'			DrawImage createdImage , 400, 300
'		End
		
		RenderHunter()
		RenderBullets()
		SetColor(0, 0, 255)
		DrawText("Score : " + score, 10, 10)
		If Debug Then
			'diddyGame.DrawDebug() 'debug mode	
		EndIf
		
	End
	
End