'use strict'

const MINE = '💣'
const FLAG = '🚩'
const LIVE = '💗'
const HINT = '💡'

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
    renderMarkedMines()
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

function renderMarkedMines() {
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

    const { i, j } = getCellCoords(elCell)
    const cell = gBoard[i][j]

    if (cell.isShown) return

    cell.isMarked = !cell.isMarked
    gGame.markedCount += cell.isMarked ? 1 : -1

    checkWin()
    renderBoard()
    renderMarkedMines()
}

function onCellClicked(elCell) {
    if (!gGame.isOn) return

    const coords = getCellCoords(elCell)
    const cell = gBoard[coords.i][coords.j]

    if (cell.isShown || cell.isMarked) return

    if (gGame.isHintUsed) return handleHint(coords)
    if (gGame.isManualMode) return handleManualMode(coords)
    if (gGame.isMegaHint) return handleMegaHint(coords)

    gGame.prevBoards.push(JSON.parse(JSON.stringify(gBoard)))

    handleFirstClick(cell)
    expandShown(cell, coords)
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
    renderMarkedMines()
    renderSafeClicks()
    renderBoard()
}

function onUndo() {
    if (!gGame.prevBoards.length) return
    gBoard = gGame.prevBoards.pop()
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

function expandShown(cell, coords) {
    if (cell.isMine || cell.isShown || cell.isMarked) return

    cell.isShown = true
    gGame.shownSafeCount++
    removeHiddenSafeCell(coords)

    if (cell.minesAroundCount) return

    for (let i = coords.i - 1; i <= coords.i + 1; i++) {
        if (i < 0 || i > gBoard.length - 1) continue
        for (let j = coords.j - 1; j <= coords.j + 1; j++) {
            if (j < 0 || j > gBoard[i].length - 1) continue
            if (i === coords.i && j === coords.j) continue

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
    if (gGame && gGame.timerInterval) clearInterval(gGame.timerInterval)
    document.querySelector('.timer').innerText = '00:00'
}

function saveScore() {
    const score = loadFromStorage('score')
    if (score && score < gGame.secsPassed) return

    saveToStorage('score', gGame.secsPassed)
}

function enableMegaBtn() {
    document.querySelector('.btn-mega').disabled = false
}

function removeHiddenSafeCell(coords) {
    for (let i = 0; i < gGame.hiddenSafeCoords.length; i++) {
        const currCoord = gGame.hiddenSafeCoords[i]
        if (currCoord.i === coords.i && currCoord.j === coords.j) {
            gGame.hiddenSafeCoords.splice(i, 1)
        }
    }
}

function checkWin() {
    const safeCells = gLevel.SIZE ** 2 - gLevel.MINES
    console.log('safeCells:', safeCells)
    console.log('gGame.shownSafeCount:', gGame.shownSafeCount)
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
    startTimer()
}

function handleMine(cell) {
    if (!cell.isMine) return
    cell.isShown = true
    gGame.liveCount--
    gGame.markedCount++
    renderLives()
    renderMarkedMines()
    checkLose()
}

function handleHint(coords) {
    for (let i = coords.i - 1; i <= coords.i + 1; i++) {
        if (i < 0 || i > gBoard.length - 1) continue
        for (let j = coords.j - 1; j <= coords.j + 1; j++) {
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

function handleManualMode(coords) {
    gGame.minesToPlace.push(coords)

    const elCell = getElCell(coords)
    elCell.innerText = MINE

    if (gGame.minesToPlace.length >= gLevel.MINES) {
        const elBoard = document.querySelector('.board')
        elBoard.classList.remove('manual')

        handleFirstClick()
        renderMarkedMines()
        renderBoard()
    }
}

function handleMegaHint(coords) {
    gGame.megaHintCoords.push(coords)
    const elCell = getElCell(coords)
    elCell.classList.add('selected')

    if (gGame.megaHintCoords.length < 2) return

    const topLeftCoord = gGame.megaHintCoords[0]
    const bottomRightCoord = gGame.megaHintCoords[1]

    const elBoard = document.querySelector('.board')
    const elBtn = document.querySelector('.btn-mega')

    for (let i = topLeftCoord.i; i <= bottomRightCoord.i; i++) {
        for (let j = topLeftCoord.j; j <= bottomRightCoord.j; j++) {
            const currCell = gBoard[i][j]
            if(currCell.isShown) continue

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
        const coord = gGame.isManualMode ? gGame.minesToPlace[i] : getSafeCoord()
        gBoard[coord.i][coord.j].isMine = true

        if (gGame.isManualMode) removeHiddenSafeCell({ i: coord.i, j: coord.j })
    }

    if (gGame.isManualMode) gGame.isManualMode = false
}

function setLevel(diff = 2) {
    if (diff === 1) gLevel = { SIZE: 4, MINES: 2 }
    else if (diff === 2) gLevel = { SIZE: 6, MINES: 6 }
    else if (diff === 3) gLevel = { SIZE: 8, MINES: 12 }
}

function getMinesAroundCount(coords) {
    var count = 0
    for (let i = coords.i - 1; i <= coords.i + 1; i++) {
        if (i < 0 || i > gBoard.length - 1) continue
        for (let j = coords.j - 1; j <= coords.j + 1; j++) {
            if (j < 0 || j > gBoard[i].length - 1) continue
            if (i === coords.i && j === coords.j) continue

            if (gBoard[i][j].isMine) count++
        }
    }

    return count
}

function getSafeCoord() {
    const randIdx = getRandomInt(0, gGame.hiddenSafeCoords.length)
    return gGame.hiddenSafeCoords.splice(randIdx, 1)[0]
}

function getCellContent(cell) {
    var cellContent = ''

    if (cell.isShown) {
        if (cell.isMine) cellContent = MINE
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

    return cellClass
}

function createCell() {
    return {
        minesAroundCount: 0,
        isShown: false,
        isMine: false,
        isMarked: false,
        isHint: false
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
        minesToPlace: [],
        prevBoards: [],
        megaHintCoords: []
    }
}