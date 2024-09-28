'use strict'

const MINE = '💣'
const FLAG = '🚩'
const LIVE = '💗'
const HINT = '💡'
const FIRE = '🔥'

const SMILEY_NORMAL = '😀'
const SMILEY_SAD = '😭'
const SMILEY_WIN = '😎'
const SMILEY_DANGER = '😯'

var gBoard
var gGame
var gLevel

function onInit() {
    stopTimer()
    setLevel()
    buildBoard()
    createGame()
    enableMegaBtn()
    renderGame()
}

function buildBoard() {
    const board = []

    for (let i = 0; i < gLevel.SIZE; i++) {
        board.push([])
        for (let j = 0; j < gLevel.SIZE; j++) {
            board[i][j] = createCell()
        }
    }

    gBoard = board
}

function renderGame() {
    renderBoard()
    renderLives()
    renderHints()
    renderSmiley()
    renderMarkedCount()
    renderScore()
    renderSafeClicks()
}

function renderBoard() {
    var strHTML = ''

    for (let i = 0; i < gBoard.length; i++) {
        strHTML += `<tr>`
        for (let j = 0; j < gBoard[i].length; j++) {
            const currCell = gBoard[i][j]
            const cellClass = getCellClass(currCell)
            const cellContent = getCellContent(currCell)

            strHTML +=
                `<td class="cell ${cellClass}" data-i=${i} data-j=${j} 
                    onclick="onCellClicked(this)" 
                    oncontextmenu="onCellMarked(event, this)">
                    ${cellContent}
                </td>`
        }
        strHTML += `</tr>`
    }

    document.querySelector('.board').innerHTML = strHTML
}

function renderLives() {
    var strHTML = ''

    for (let i = 0; i < gGame.liveCount; i++) {
        strHTML += `<li>${LIVE}</li>`
    }

    document.querySelector('.lives-list').innerHTML = strHTML
}

function renderHints() {
    var strHTML = ''

    for (let i = 0; i < gGame.hintCount; i++) {
        strHTML += `<li class="hint" onclick="onSelectHint(this)">${HINT}</li>`
    }

    document.querySelector('.hints-list').innerHTML = strHTML
}

function renderSmiley(smiley = SMILEY_NORMAL) {
    document.querySelector('.game-container .smiley').innerText = smiley
}

function renderMarkedCount() {
    document.querySelector('.marked-mines').innerText = gLevel.MINES - gGame.markedCount
}

function renderScore() {
    const score = loadFromStorage('score')
    const elScore = document.querySelector('.score span')
    if (!score) {
        elScore.innerText = 'no best score yet!'
        return
    }

    elScore.innerText = score + ' seconds'
}

function renderSafeClicks() {
    document.querySelector('.btn-safe span').innerText = gGame.safeCount
}

function onCellMarked(ev, elCell) {
    ev.preventDefault()
    if (!gGame.isOn) return

    const { i, j } = getCellCoord(elCell)
    const cell = gBoard[i][j]

    if (cell.isShown) return

    cell.isMarked = !cell.isMarked
    gGame.markedCount += cell.isMarked ? 1 : -1

    checkWin()
    renderBoard()
    renderMarkedCount()
}

function onCellClicked(elCell) {
    if (!gGame.isOn) return

    const coord = getCellCoord(elCell)
    const cell = gBoard[coord.i][coord.j]

    if (cell.isShown || cell.isMarked) return

    if (gGame.isHintUsed) return handleHint(coord)
    if (gGame.isManualMode) return handleManualMode(coord)
    if (gGame.isMegaHint) return handleMegaHint(coord)

    handleFirstClick(cell)
    saveAction()
    expandShown(cell, coord)
    handleMine(cell)
    checkWin()
    renderBoard()
}

function onChangeLevel(diff) {
    stopTimer()
    setLevel(diff)
    buildBoard()
    createGame()
    enableMegaBtn()
    renderGame()
}

function onSelectHint(elHint) {
    if (elHint.classList.contains('selected')) {
        gGame.isHintUsed = false
        elHint.classList.remove('selected')
        return
    }

    const elPrevSelectedHint = document.querySelector('.hint.selected')
    if (elPrevSelectedHint) {
        elPrevSelectedHint.classList.remove('selected')
    }

    gGame.isHintUsed = true
    elHint.classList.add('selected')
}

function onSafeClick() {
    if (gGame.safeCount <= 0 || !gGame.isOn) return

    const coord = getSafeCoord()
    if (!coord) return

    const elCell = getElCell(coord)
    elCell.classList.add('highlight')

    setTimeout(() => {
        gGame.safeCount--
        elCell.classList.remove('highlight')
        renderSafeClicks()
    }, 1000)
}

function onManualMode() {
    const mineCount = +prompt('How many mines would you like to place?')
    if (!mineCount || mineCount > gLevel.SIZE ** 2) return

    const elBoard = document.querySelector('.board')
    elBoard.classList.add('manual')

    stopTimer()
    createGame()
    gGame.isManualMode = true
    gLevel.MINES = mineCount

    buildBoard()
    renderMarkedCount()
    renderSafeClicks()
    renderBoard()
}

function onUndo() {
    const { actions } = gGame
    if (!actions.length || !gGame.isOn) return

    const { board, hiddenSafeCoords, shownSafeCount } = gGame.actions.pop()

    gGame.hiddenSafeCoords = hiddenSafeCoords
    gGame.shownSafeCount = shownSafeCount
    gBoard = board
    renderBoard()
}

function onToggleDarkMode() {
    document.body.classList.toggle('darkmode')
}

function onMegaHint(elBtn) {
    const elBoard = document.querySelector('.board')

    if (gGame.isMegaHint) {
        gGame.isMegaHint = false
        elBtn.innerText = 'Mega Hint'
        elBoard.classList.remove('mega-hint')
        return
    }

    gGame.isMegaHint = true
    elBtn.innerText = 'Cancel'
    elBoard.classList.add('mega-hint')
}

function onExterminate() {
    if (!gGame.minesCoords.length) return
    const length = gGame.minesCoords.length >= 3 ? 3 : gGame.minesCoords.length

    for (let i = 0; i < length; i++) {
        const coord = getMineCoord()
        const cell = gBoard[coord.i][coord.j]

        cell.isShown = true
        cell.isBlown = true
        cell.isMine = false
        gGame.markedCount++
    }

    setMinesNegsCount()
    renderMarkedCount()
    renderBoard()
    checkWin()
}

function expandShown(cell, coord) {
    if (cell.isMine || cell.isShown || cell.isMarked) return

    cell.isShown = true
    gGame.shownSafeCount++
    removeHiddenSafeCell(coord)

    if (cell.minesAroundCount) return

    for (let i = coord.i - 1; i <= coord.i + 1; i++) {
        if (i < 0 || i > gBoard.length - 1) continue
        for (let j = coord.j - 1; j <= coord.j + 1; j++) {
            if (j < 0 || j > gBoard[i].length - 1) continue
            if (i === coord.i && j === coord.j) continue

            const currCell = gBoard[i][j]
            expandShown(currCell, { i, j })
        }
    }
}

function startTimer() {
    const elTimer = document.querySelector('.timer')

    gGame.timerInterval = setInterval(() => {
        gGame.secsPassed++

        let minutes = Math.floor(gGame.secsPassed / 60)
        let seconds = gGame.secsPassed % 60

        minutes = minutes < 10 ? '0' + minutes : minutes
        seconds = seconds < 10 ? '0' + seconds : seconds

        elTimer.innerText = minutes + ':' + seconds
    }, 1000)
}

function stopTimer() {
    if (gGame && gGame.timerInterval) {
        clearInterval(gGame.timerInterval)
        gGame.secsPassed = 0
    }
    document.querySelector('.timer').innerText = '00:00'
}

function saveScore() {
    const score = loadFromStorage('score')
    if (score && score < gGame.secsPassed) return

    saveToStorage('score', gGame.secsPassed)
}

function saveAction() {
    const action = {
        board: JSON.parse(JSON.stringify(gBoard)),
        hiddenSafeCoords: JSON.parse(JSON.stringify(gGame.hiddenSafeCoords)),
        shownSafeCount: gGame.shownSafeCount,
    }

    gGame.actions.push(action)
}

function enableMegaBtn() {
    document.querySelector('.btn-mega').disabled = false
}

function removeHiddenSafeCell(coord) {
    for (let i = 0; i < gGame.hiddenSafeCoords.length; i++) {
        const currCoord = gGame.hiddenSafeCoords[i]
        if (currCoord.i === coord.i && currCoord.j === coord.j) {
            gGame.hiddenSafeCoords.splice(i, 1)
        }
    }
}

function removeMineCoord(coord) {
    for (let i = 0; i < gGame.minesCoords.length; i++) {
        const currCoord = gGame.minesCoords[i]
        if (currCoord.i === coord.i && currCoord.j === coord.j) {
            gGame.minesCoords.splice(i, 1)
        }
    }
}

function checkWin() {
    const safeCells = gLevel.SIZE ** 2 - gLevel.MINES
    if (gGame.shownSafeCount === safeCells && gGame.markedCount === gLevel.MINES) {
        gGame.isOn = false
        clearInterval(gGame.timerInterval)
        saveScore()
        renderSmiley(SMILEY_WIN)
        renderScore()
    }
}

function checkLose() {
    if (gGame.liveCount > 0) return
    gGame.isOn = false
    renderSmiley(SMILEY_SAD)
    clearInterval(gGame.timerInterval)
}

function handleFirstClick(cell) {
    if (gGame.isFirstClick) return
    if (cell) {
        cell.isShown = true
        gGame.shownSafeCount++
    }
    gGame.isFirstClick = true
    setHiddenSafeCoords()
    setMines()
    setMinesNegsCount()
    stopTimer()
    startTimer()
}

function handleMine(cell) {
    if (!cell.isMine) return
    cell.isShown = true
    gGame.liveCount--
    gGame.markedCount++
    renderLives()
    renderMarkedCount()
    checkLose()
}

function handleHint(coord) {
    for (let i = coord.i - 1; i <= coord.i + 1; i++) {
        if (i < 0 || i > gBoard.length - 1) continue
        for (let j = coord.j - 1; j <= coord.j + 1; j++) {
            if (j < 0 || j > gBoard[i].length - 1) continue
            if (gBoard[i][j].isShown) continue

            const currCell = gBoard[i][j]
            currCell.isShown = true
            currCell.isHint = true

            setTimeout(() => {
                currCell.isShown = false
                currCell.isHint = false
                renderHints()
                renderBoard()
            }, 1000)
        }
    }

    gGame.isHintUsed = false
    gGame.hintCount--

    renderBoard()
}

function handleManualMode(coord) {
    const elCell = getElCell(coord)
    
    if(elCell.innerText === MINE) {
        removeMineCoord(coord)
        gGame.markedCount--
        elCell.innerText = ''
    } else {
        gGame.minesCoords.push(coord)
        gGame.markedCount++
        elCell.innerText = MINE
    }

    if (gGame.minesCoords.length >= gLevel.MINES) {
        const elBoard = document.querySelector('.board')
        elBoard.classList.remove('manual')

        gGame.markedCount = 0
        handleFirstClick()
        renderBoard()
    }

    renderMarkedCount()
}

function handleMegaHint(coord) {
    gGame.megaHintCoords.push(coord)
    const elCell = getElCell(coord)
    elCell.classList.add('selected')

    if (gGame.megaHintCoords.length < 2) return

    const topLeftCoord = gGame.megaHintCoords[0]
    const bottomRightCoord = gGame.megaHintCoords[1]

    const elBoard = document.querySelector('.board')
    const elBtn = document.querySelector('.btn-mega')

    for (let i = topLeftCoord.i; i <= bottomRightCoord.i; i++) {
        for (let j = topLeftCoord.j; j <= bottomRightCoord.j; j++) {
            const currCell = gBoard[i][j]
            if (currCell.isShown) continue

            currCell.isShown = true
            currCell.isHint = true

            setTimeout(() => {
                currCell.isShown = false
                currCell.isHint = false
                renderBoard()
            }, 2000)
        }
    }

    gGame.isMegaHint = false
    elBtn.disabled = true
    elBtn.innerText = 'Mega Hint'
    elBoard.classList.remove('mega-hint')
    renderBoard()
}

function setHiddenSafeCoords() {
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[i].length; j++) {
            if (gBoard[i][j].isShown || gBoard[i][j].isMine) continue
            gGame.hiddenSafeCoords.push({ i, j })
        }
    }
}

function setMinesNegsCount() {
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[i].length; j++) {
            const currCell = gBoard[i][j]
            currCell.minesAroundCount = getMinesAroundCount({ i, j })
        }
    }
}

function setMines() {
    for (let i = 0; i < gLevel.MINES; i++) {
        var coord = null

        if (gGame.isManualMode) {
            coord = gGame.minesCoords[i]
            removeHiddenSafeCell({ i: coord.i, j: coord.j })
        } else {
            coord = getSafeCoord()
            gGame.minesCoords.push(coord)
        }

        gBoard[coord.i][coord.j].isMine = true
    }

    if (gGame.isManualMode) gGame.isManualMode = false
}

function setLevel(diff = 2) {
    if (diff === 1) gLevel = { SIZE: 4, MINES: 2 }
    else if (diff === 2) gLevel = { SIZE: 6, MINES: 6 }
    else if (diff === 3) gLevel = { SIZE: 8, MINES: 12 }
}

function getMinesAroundCount(coord) {
    var count = 0
    for (let i = coord.i - 1; i <= coord.i + 1; i++) {
        if (i < 0 || i > gBoard.length - 1) continue
        for (let j = coord.j - 1; j <= coord.j + 1; j++) {
            if (j < 0 || j > gBoard[i].length - 1) continue
            if (i === coord.i && j === coord.j) continue

            if (gBoard[i][j].isMine) count++
        }
    }

    return count
}

function getMineCoord() {
    const randIdx = getRandomInt(0, gGame.minesCoords.length)
    return gGame.minesCoords.splice(randIdx, 1)[0]
}

function getSafeCoord() {
    const randIdx = getRandomInt(0, gGame.hiddenSafeCoords.length)
    return gGame.hiddenSafeCoords.splice(randIdx, 1)[0]
}

function getCellContent(cell) {
    var cellContent = ''

    if (cell.isShown) {
        if (cell.isBlown) cellContent = FIRE
        else if (cell.isMine) cellContent = MINE
        else if (cell.minesAroundCount) cellContent = cell.minesAroundCount
    }

    if (cell.isMarked) cellContent = FLAG

    return cellContent
}

function getCellClass(cell) {
    var cellClass = ''

    if (cell.isShown) cellClass += 'shown '
    if (cell.isMine) cellClass += 'mine '
    if (cell.isHint) cellClass += 'highlight '
    if (cell.isBlown) cellClass += 'blown'

    return cellClass
}

function createCell() {
    return {
        minesAroundCount: 0,
        isShown: false,
        isMine: false,
        isMarked: false,
        isHint: false,
        isBlown: false
    }
}

function createGame() {
    gGame = {
        isOn: true,
        isFirstClick: false,
        isHintUsed: false,
        isManualMode: false,
        isMegaHint: false,
        isMegaUsed: false,
        shownSafeCount: 0,
        markedCount: 0,
        hintCount: 3,
        liveCount: 3,
        safeCount: 3,
        secsPassed: 0,
        timerInterval: 0,
        hiddenSafeCoords: [],
        minesCoords: [],
        actions: [],
        megaHintCoords: []
    }
}