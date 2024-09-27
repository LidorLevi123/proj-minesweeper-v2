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
var gEmptyPositions

function onInit() {
    stopTimer()
    setLevel()
    createGame()
    buildBoard()
    renderGame()
}

function renderGame() {
    renderBoard()
    renderLives()
    renderHints()
    renderSmiley()
    renderMarkedMines()
    renderScore()
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

    handleFirstClick(cell)
    expandShown(cell, coords)
    handleMine(cell)
    checkWin()
    renderBoard()
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

function expandShown(cell, coords) {
    if (cell.isMine || cell.isShown || cell.isMarked) return

    cell.isShown = true
    gGame.shownSafeCount++

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
    cell.isShown = true
    gGame.shownSafeCount++
    gGame.isFirstClick = true
    setEmptyPositions()
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

function setEmptyPositions() {
    gEmptyPositions = []
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[i].length; j++) {
            if (gBoard[i][j].isShown) continue
            gEmptyPositions.push({ i, j })
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
        const pos = getEmptyPos()
        gBoard[pos.i][pos.j].isMine = true
    }
}

function setLevel(diff = 1) {
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

function getEmptyPos() {
    const randIdx = getRandomInt(0, gEmptyPositions.length)
    return gEmptyPositions.splice(randIdx, 1)[0]
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
        isMarked: false
    }
}

function createGame() {
    gGame = {
        isOn: true,
        isFirstClick: false,
        isHintUsed: false,
        shownSafeCount: 0,
        markedCount: 0,
        hintCount: 3,
        liveCount: 3,
        secsPassed: 0,
        timerInterval: 0,
    }
}