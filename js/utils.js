'use strict'

// Return a random number between min - max(exclusive)
function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min)
    const maxFloored = Math.floor(max)
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
}

function getSelector(coords) {
    return `.cell-${coords.i}-${coords.j}`
}

function getCellCoords(elCell) {
    const i = +elCell.dataset.i
    const j = +elCell.dataset.j
    return { i, j }
} 