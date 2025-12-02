// Simple router - strip base path to get the route
const BASE = import.meta.env.BASE_URL
function getRoute(): string {
  const path = window.location.pathname
  // Remove base path prefix if present
  if (path.startsWith(BASE)) {
    return path.slice(BASE.length) || ''
  }
  return path.replace(/^\//, '')
}

// Check route and load appropriate page
const route = getRoute()
if (route === 'life') {
  import('./life/life').then(({ initLife }) => initLife())
} else if (route === 'solar') {
  import('./solar/solar').then(({ initSolar }) => initSolar())
} else if (route === 'cellular-automata') {
  import('./cellular-automata/cellular-automata').then(({ initCellularAutomata }) => initCellularAutomata())
} else {
  import('./index/index').then(({ initIndex }) => initIndex())
}
