Strict

Import gameClasses

Global titleScreen:TitleScreen
Global gameScreen:GameScreen

Class Game Extends DiddyApp
	Method OnCreate:Int()
		Super.OnCreate()
		titleScreen = New TitleScreen
		gameScreen = New GameScreen
		titleScreen.PreStart()
		Return 0
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
	Method New()
		name = "Gameplay"
	End
	
	Method Start:Void()
		bunny = New Bunny(SCREEN_HEIGHT2, SCREEN_WIDTH2)
	End
	
	Method Update:Void()
		bunny.Update()
	End
	
	Method Render:Void()
		Cls(152, 64, 32)
		bunny.Draw()
	End
	
End