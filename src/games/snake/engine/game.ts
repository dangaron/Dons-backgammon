// Snake game engine — pure TypeScript, no React/browser imports

export type Point = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface SnakeState {
  snake: Point[];
  food: Point;
  direction: Direction;
  nextDirection: Direction;
  score: number;
  highScore: number;
  gameOver: boolean;
  paused: boolean;
  gridSize: number;
  speed: number;
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/**
 * Place food at a random position that doesn't overlap the snake.
 */
export function randomFood(snake: Point[], gridSize: number): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  if (free.length === 0) {
    // Board is full — shouldn't happen in normal play
    return { x: 0, y: 0 };
  }
  return free[Math.floor(Math.random() * free.length)];
}

/**
 * Compute interval (ms) based on current score.
 * Starts at 150 ms, decreasing toward a minimum of 60 ms.
 */
export function getSpeed(score: number): number {
  return Math.max(60, 150 - Math.floor(score / 3) * 5);
}

/**
 * Create the initial game state.
 */
export function createGame(gridSize = 20, highScore = 0): SnakeState {
  const midX = Math.floor(gridSize / 2);
  const midY = Math.floor(gridSize / 2);

  const snake: Point[] = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];

  return {
    snake,
    food: randomFood(snake, gridSize),
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    highScore,
    gameOver: false,
    paused: false,
    gridSize,
    speed: getSpeed(0),
  };
}

/**
 * Set direction, preventing 180-degree reversals.
 */
export function setDirection(state: SnakeState, dir: Direction): SnakeState {
  if (OPPOSITE[dir] === state.direction) {
    return state;
  }
  return { ...state, nextDirection: dir };
}

/**
 * Advance the game by one tick.
 */
export function tick(state: SnakeState): SnakeState {
  if (state.gameOver || state.paused) return state;

  const direction = state.nextDirection;
  const head = state.snake[0];

  const delta: Record<Direction, Point> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const d = delta[direction];
  const newHead: Point = { x: head.x + d.x, y: head.y + d.y };

  // Wall collision
  if (
    newHead.x < 0 ||
    newHead.x >= state.gridSize ||
    newHead.y < 0 ||
    newHead.y >= state.gridSize
  ) {
    return {
      ...state,
      direction,
      gameOver: true,
      highScore: Math.max(state.highScore, state.score),
    };
  }

  // Self collision (check against current body minus tail — tail moves away unless eating)
  const ateFood = newHead.x === state.food.x && newHead.y === state.food.y;
  const body = ateFood ? state.snake : state.snake.slice(0, -1);
  if (body.some((p) => p.x === newHead.x && p.y === newHead.y)) {
    return {
      ...state,
      direction,
      gameOver: true,
      highScore: Math.max(state.highScore, state.score),
    };
  }

  const newSnake = [newHead, ...state.snake];
  let newScore = state.score;
  let newFood = state.food;

  if (ateFood) {
    newScore += 1;
    newFood = randomFood(newSnake, state.gridSize);
  } else {
    newSnake.pop();
  }

  const newHighScore = Math.max(state.highScore, newScore);

  return {
    ...state,
    snake: newSnake,
    food: newFood,
    direction,
    nextDirection: direction,
    score: newScore,
    highScore: newHighScore,
    speed: getSpeed(newScore),
    gameOver: false,
  };
}
