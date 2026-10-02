---
title: API reference
---

# API reference

Every function below compiles to one Scratch block. Arguments are type-checked: `SpriteName`, `CostumeName`, `BackdropName` and
`SoundName` only accept names that exist in your project.

## <span className="blk events">Events</span>

| Function | Block |
|---|---|
| `whenFlag(() => {})` | when green flag clicked |
| `whenKey(key, () => {})` | when [key] key pressed |
| `whenClicked(() => {})` | when this sprite clicked / when stage clicked |
| `whenBackdrop(name, () => {})` | when backdrop switches to [name] |
| `whenGreater("loudness" \| "timer", value, () => {})` | when [loudness] > (value) |
| `onMessage(message, () => {})` | when I receive [message] |
| `onClone(() => {})` | when I start as a clone |
| `broadcast(message)` | broadcast [message] |
| `broadcastAndWait(message)` | broadcast [message] and wait |

## <span className="blk motion">Motion</span>

| Function | Block |
|---|---|
| `move(steps)` | move (steps) steps |
| `turnRight(deg)` / `turnLeft(deg)` | turn ↻ / ↺ (deg) degrees |
| `goTo(x, y)` | go to x: y: |
| `goToTarget(sprite \| "mouse" \| "random")` | go to [target] |
| `glide(secs, x, y)` | glide (secs) secs to x: y: |
| `glideToTarget(secs, target)` | glide (secs) secs to [target] |
| `pointInDirection(deg)` | point in direction (deg) |
| `pointTowards(sprite \| "mouse")` | point towards [target] |
| `bounceOnEdge()` | if on edge, bounce |
| `me.x`, `me.y`, `me.direction` | x position / y position / direction; assign with `=`, `+=`, `-=` |
| `me.rotationStyle = "left-right"` | set rotation style |

## <span className="blk looks">Looks</span>

| Function | Block |
|---|---|
| `say(msg)` / `sayFor(msg, secs)` | say / say for secs |
| `think(msg)` / `thinkFor(msg, secs)` | think / think for secs |
| `switchCostume(name \| number)` / `nextCostume()` | switch costume to / next costume |
| `switchBackdrop(name \| number)` / `nextBackdrop()` | switch backdrop to / next backdrop |
| `setEffect(effect, v)` / `changeEffect(effect, v)` / `clearEffects()` | graphic effects (`"color"`, `"ghost"`, `"brightness"`, ...) |
| `goToFront()` / `goToBack()` | go to front / back layer |
| `moveForward(n)` / `moveBackward(n)` | go forward / backward (n) layers |
| `me.size`, `me.visible` | size / show / hide |
| `me.costumeNumber`, `me.costumeName`, `me.backdropNumber`, `me.backdropName` | costume and backdrop reporters |

## <span className="blk sound">Sound</span>

| Function | Block |
|---|---|
| `playSound(name)` / `playSoundUntilDone(name)` | start sound / play sound until done |
| `stopAllSounds()` | stop all sounds |
| `setSoundEffect("pitch" \| "pan", v)` / `changeSoundEffect(...)` / `clearSoundEffects()` | sound effects |
| `me.volume` | volume / set volume / change volume |

## <span className="blk control">Control</span>

| Function | Block |
|---|---|
| `wait(secs)` | wait (secs) seconds |
| `waitUntil(() => cond)` | wait until ⟨cond⟩ |
| `repeat(n, () => {})` | repeat (n) |
| `forever(() => {})` | forever |
| `stopAll()` / `stopThis()` / `stopOthers()` | stop all / this script / other scripts in sprite |
| `createClone(sprite?)` | create clone of [myself] |
| `deleteClone()` | delete this clone |

## <span className="blk sensing">Sensing</span>

| Function | Block |
|---|---|
| `touching(sprite \| "edge" \| "mouse")` | touching [ ]? |
| `touchingColor("#ff0000")` | touching color? |
| `distanceTo(sprite \| "mouse")` | distance to [ ] |
| `keyPressed(key)` | key [ ] pressed? |
| `mouseDown()`, `mouseX()`, `mouseY()` | mouse reporters |
| `askAndWait(question)` / `answer()` | ask and wait / answer |
| `timer()` / `resetTimer()` | timer / reset timer |
| `loudness()` | loudness |
| `current("year" \| "month" \| ... )` | current [year] |
| `daysSince2000()`, `username()` | days since 2000 / username |
| `valueOf(sprite, "x position")` | [x position] of [sprite] |
| `me.draggable = true` | set drag mode |

## <span className="blk operators">Operators</span>

| Code | Block |
|---|---|
| `random(a, b)` | pick random (a) to (b) |
| `sin`, `cos`, `tan`, `asin`, `acos`, `atan` (degrees) | [sin] of |
| `Math.abs/floor/ceil/sqrt/log/log10/exp` | [abs] of, ... |
| `Math.round(x)` | round |
| `Math.min(a, b)` / `Math.max(a, b)` | computed with abs |
| `Math.random()` | pick random 0 to 1.0 |
| `Math.PI`, `Math.E` | constants |
| `String(x)`, `Number(x)` | join / add 0 |

## <span className="blk variables">Variables</span> & <span className="blk lists">Lists</span>

| Code | Block |
|---|---|
| `x = v`, `x += v`, `x++` | set / change variable |
| `showVariable(x)` / `hideVariable(x)` | show / hide variable (or list) |
| `list.push(v)` | add (v) to [list] |
| `list.insert(i, v)` / `list.unshift(v)` | insert at |
| `list.remove(i)` / `list.splice(i, 1)` / `list.pop()` / `list.shift()` | delete (i) of [list] |
| `list[i]` / `list[i] = v` | item (i) of / replace item |
| `list.length` / `list.length = 0` | length of / delete all of |
| `list.indexOf(v)` / `list.includes(v)` | item # of / contains |

## <span className="blk pen">Pen</span>

| Function | Block |
|---|---|
| `penDown()` / `penUp()` / `penClear()` / `stamp()` | pen down / up / erase all / stamp |
| `setPenColor("#hex")` | set pen color to |
| `setPenSize(n)` / `changePenSize(n)` | pen size |
| `setPenParam(param, v)` / `changePenParam(param, v)` | set / change pen [color] |
