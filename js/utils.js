'use strict'

// Return a random number between min - max(exclusive)
function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min)
    const maxFloored = Math.floor(max)
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
}

function getElCell(coords) {
    const { i, j } = coords
    return document.querySelector(`[data-i="${i}"][data-j="${j}"]`)
}

function getCellCoords(elCell) {
    const i = +elCell.dataset.i
    const j = +elCell.dataset.j
    return { i, j }
} 

function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
}

function loadFromStorage(key) {
    const data = localStorage.getItem(key)
    return (data) ? JSON.parse(data) : undefined
}