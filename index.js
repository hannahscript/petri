const PETRI_WIDTH = 100;
const PETRI_HEIGHT = 100;
const MIN_MITOSIS_ENERGY = 50;
const MUTATION_CHANCE = 0.01;
const MAX_AGE = 50;

const cellExample = {
    dna: {
        idealTemp: 5,
    },
    state: {
        energy: 10,
        age: 0
    }
};

function coordsToIndex(x, y) {
    return y * PETRI_WIDTH + x;
}

// Things like whether a cell has already undergone mitosis, moved, ... are not stored in the oldDish/newDish
// But in a structure called stepState which is refreshed every update step
const stepStateExample = {
    energyChange: 2,
    doMitosis: true,
    mitosisFrom: 12 // Index for oldDish
}

function getCell(dish, x, y) {
    return dish[coordsToIndex(x, y)];
}

function setCell(dish, x, y, cell) {
    return dish[coordsToIndex(x, y)] = cell;
}

function getStepState(stepStates, x, y) {
    return stepStates[coordsToIndex(x, y)];
}

function getTemperature(x, y) {
    const dist = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
    return Math.floor(Math.min(dist, 50) / 50 * 20) - 10;
}

function getEnergyChange(cell, x, y) {
    if (cell.state.age >= MAX_AGE) {
        return -3;
    }

    const tempDiff = Math.abs(cell.dna.idealTemp - getTemperature(x, y));
    return (2 - tempDiff) || -1;
}

function stepCell(oldDish, stepStates, x, y) {
    const oldCell = getCell(oldDish, x, y);

    if (oldCell == null) {
        const mitosisCellIndex = getMitosisCandidate(oldDish, stepStates, x, y);

        if (mitosisCellIndex >= 0) {
            const emptyCellStepstate = getStepState(stepStates, x, y);
            const mitosisCellStepstate = stepStates[mitosisCellIndex];

            emptyCellStepstate.mitosisFrom = oldDish[mitosisCellIndex];
            mitosisCellStepstate.doMitosis = true;
        }
    } else {
            const energyChange = getEnergyChange(oldCell, x, y);
            const stepState = getStepState(stepStates, x, y);
            stepState.energyChange = energyChange;
    }
}

function getMitosisCandidate(dish, stepStates, x, y) {
    const neighbours = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const cx = x + dx;
            const cy = y + dy;

            const nb = getCell(dish, cx, cy);
            //if (nb) console.log(nb);

            if (nb && nb.state.energy >= MIN_MITOSIS_ENERGY) {
                const stepState = getStepState(stepStates, cx, cy);

                // Do not repeat mitosis in the same step
                if (!stepState.doMitosis) {
                    neighbours.push(coordsToIndex(cx, cy));
                }
            }
        }
    }

    return pickRandom(neighbours);
}

function cloneCell(cell) {
    return {
        dna: {
            idealTemp: cell.dna.idealTemp
        },
        state: {
            energy: cell.state.energy,
            age: cell.state.age
        }
    };
}

function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function chance(p) {
    return p >= Math.random();
}

function createChildCell(cell) {
    const clone = cloneCell(cell);
    clone.state.energy = Math.floor(clone.state.energy / 2);
    clone.state.age = 0;

    // Mutate
    if (chance(MUTATION_CHANCE)) {
        clone.dna.idealTemp += Math.floor(Math.random() * 21) - 10;
    }

    return clone;
}

function splitParentCell(oldDish, x, y) {
    const clone = cloneCell(getCell(oldDish, x, y));
    clone.state.energy = Math.floor(clone.state.energy / 2);
    clone.state.age += 1;
    return clone;
}

function changeEnergy(oldDish, x, y, energyChange) {
    const oldCell = getCell(oldDish, x, y);

    if (!oldCell) {
        return null;
    }

    const newEnergy = oldCell.state.energy + energyChange;
    if (newEnergy <= 0) {
        return null;
    } else {
        const clone = cloneCell(oldCell);
        clone.state.energy = newEnergy;
        clone.state.age += 1;
        return clone;
    }
}

function stepDish(oldDish, newDish, stepStates) {
    for (let y = 0; y < PETRI_HEIGHT; y++) {
        for (let x = 0; x < PETRI_WIDTH; x++) {
            stepCell(oldDish, stepStates, x, y);
        }
    }

    // Consolidate stepStates
    for (let y = 0; y < PETRI_HEIGHT; y++) {
        for (let x = 0; x < PETRI_WIDTH; x++) {
            const stepState = getStepState(stepStates, x, y);
            if (stepState.mitosisFrom) {
                setCell(newDish, x, y, createChildCell(stepState.mitosisFrom));
            } else if (stepState.doMitosis) {
            } else if (stepState.doMitosis) {
                setCell(newDish, x, y, splitParentCell(oldDish, x, y));
            } else {
                setCell(newDish, x, y, changeEnergy(oldDish, x, y, stepState.energyChange));
            }
        }
    }
}

function clearStepStates(stepStates) {
    for (const stepState of stepStates) {
        stepState.doMitosis = false;
        stepState.mitosisFrom = null;
        stepState.energy = 0;
    }
}

// Drawing

function draw(ctx, dish) {
    let mode = document.getElementById('draw-mode').value;
    const rect = 10;

    if (mode === 'cells') {
        for (let y = 0; y < PETRI_HEIGHT; y++) {
            for (let x = 0; x < PETRI_WIDTH; x++) {
                const cell = getCell(dish, x, y);
                const color = cell ? Math.floor((Math.min(cell.state.energy, 50) / 50 * 255)) : 0;
                ctx.fillStyle = `rgb(0,${color},0)`;
                ctx.fillRect(x * rect, y * rect, rect, rect);
            }
        }
    } else if (mode === 'temp') {
        for (let y = 0; y < PETRI_HEIGHT; y++) {
            for (let x = 0; x < PETRI_WIDTH; x++) {
                const temp = getTemperature(x, y);
                const color = Math.floor((temp+10) / 20 * 255);
                ctx.fillStyle = `rgb(0,${color},0)`;
                ctx.fillRect(x * rect, y * rect, rect, rect);
                ctx.fillStyle = `white`;
                ctx.fillText(temp, x* rect, y*rect);
            }
        }
    } else if (mode === 'ideal-temp') {
        for (let y = 0; y < PETRI_HEIGHT; y++) {
            for (let x = 0; x < PETRI_WIDTH; x++) {
                const cell = getCell(dish, x, y);
                const idealTemp = cell && cell.dna.idealTemp;
                const color = cell ? Math.floor((idealTemp+10) / 20 * 255) : 0;
                ctx.fillStyle = `rgb(0,${color},0)`;
                ctx.fillRect(x * rect, y * rect, rect, rect);
            }
        }
    }
}

// Main
const initialCell = {
    dna: {
        idealTemp: -10
    },
    state: {
        energy: 1,
        age: 0
    }
}

let currentDish = Array.from({length: PETRI_WIDTH * PETRI_HEIGHT});
setCell(currentDish, 50, 50, initialCell);

let newDish = Array.from({length: PETRI_WIDTH * PETRI_HEIGHT});
let stepStates = Array.from({length: PETRI_WIDTH * PETRI_HEIGHT}, (v, i) => ({
    energyChange: 0,
    doMitosis: false,
    mitosisFrom: null
}));

const canvas = document.getElementById('petri-canvas');
const ctx = canvas.getContext('2d');
ctx.font = '10px sans serif';

draw(ctx, currentDish);

setInterval(update, 50);

function update() {
    stepDish(currentDish, newDish, stepStates);
    const oldDish = currentDish;
    currentDish = newDish;
    newDish = oldDish;
    clearStepStates(stepStates);

    document.getElementById('total-cells').innerText = `Total cells: ${currentDish.filter(x => x).length}`;
    //console.log(currentDish[50*100+50].state.energy);

    draw(ctx, currentDish);
}



