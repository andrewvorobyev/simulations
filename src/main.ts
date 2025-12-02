// Simple router
function getRoute(): string {
  return window.location.pathname
}

// Check route and load appropriate page
const route = getRoute()
if (route === '/life') {
  import('./life/life').then(({ initLife }) => initLife())
} else if (route === '/solar') {
  import('./solar/solar').then(({ initSolar }) => initSolar())
} else if (route === '/cellular-automata') {
  import('./cellular-automata/cellular-automata').then(({ initCellularAutomata }) => initCellularAutomata())
} else {
  import('./index/index').then(({ initIndex }) => initIndex())
}
