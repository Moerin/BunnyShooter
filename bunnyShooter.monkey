Strict
#TEXT_FILES="*.txt|*.xml|*.json|*.tmx"

Import gameClasses
#rem
	Script:		bunnyShooter.monkey
	Description:	a shooter where you'll kick hunters asses who want to catch you
					for their dinner
	Author: 		Moerin
#end

'---------------------------------
Function Main:Int()
	New Game()
	Return 0
End