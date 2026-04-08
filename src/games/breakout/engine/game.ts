// Breakout / Brick Breaker — pure TypeScript engine (no React imports)

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alive: boolean;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BreakoutState {
  paddle: Paddle;
  ball: Ball;
  bricks: Brick[];
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  won: boolean;
  launched: boolean;
  paused: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

const ROW_COLORS = [
  '#e74c3c', // red
  '#e67e22', // orange
  '#f1c40f', // yellow
  '#2ecc71', // green
  '#00bcd4', // cyan
  '#3498db', // blue
  '#9b59b6', // purple
  '#e91e8a', // pink
];

const BRICK_ROWS = 8;
const BRICK_COLS = 10;
const BRICK_PADDING = 2;
const BRICK_TOP_OFFSET = 50;
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 5;
const BASE_BALL_SPEED = 220; // pixels per second
const BALL_SPEED_LEVEL_MULT = 1.08;

function buildBricks(canvasWidth: number): Brick[] {
  const totalPadding = BRICK_PADDING * (BRICK_COLS + 1);
  const brickWidth = (canvasWidth - totalPadding) / BRICK_COLS;
  const brickHeight = 14;
  const bricks: Brick[] = [];

  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_PADDING + col * (brickWidth + BRICK_PADDING),
        y: BRICK_TOP_OFFSET + row * (brickHeight + BRICK_PADDING),
        width: brickWidth,
        height: brickHeight,
        color: ROW_COLORS[row],
        alive: true,
      });
    }
  }
  return bricks;
}

export function createGame(
  canvasWidth = 400,
  canvasHeight = 500,
  level = 1,
  score = 0,
  lives = 3,
): BreakoutState {
  const paddle: Paddle = {
    x: canvasWidth / 2 - PADDLE_WIDTH / 2,
    y: canvasHeight - 30,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };

  const ball: Ball = {
    x: canvasWidth / 2,
    y: paddle.y - BALL_RADIUS - 1,
    dx: 0,
    dy: 0,
    radius: BALL_RADIUS,
  };

  return {
    paddle,
    ball,
    bricks: buildBricks(canvasWidth),
    score,
    lives,
    level,
    gameOver: false,
    won: false,
    launched: false,
    paused: false,
    canvasWidth,
    canvasHeight,
  };
}

export function launch(state: BreakoutState): BreakoutState {
  if (state.launched || state.gameOver || state.won) return state;

  const speed = BASE_BALL_SPEED * Math.pow(BALL_SPEED_LEVEL_MULT, state.level - 1);
  // Random angle between -45 and 45 degrees from straight up
  const angle = ((Math.random() - 0.5) * Math.PI) / 3;

  return {
    ...state,
    launched: true,
    ball: {
      ...state.ball,
      dx: speed * Math.sin(angle),
      dy: -speed * Math.cos(angle),
    },
  };
}

export function movePaddle(state: BreakoutState, x: number): BreakoutState {
  const halfW = state.paddle.width / 2;
  const clampedX = Math.max(halfW, Math.min(state.canvasWidth - halfW, x));
  const newPaddle = { ...state.paddle, x: clampedX - halfW };

  // If not launched, ball follows paddle
  if (!state.launched) {
    return {
      ...state,
      paddle: newPaddle,
      ball: {
        ...state.ball,
        x: clampedX,
        y: newPaddle.y - state.ball.radius - 1,
      },
    };
  }

  return { ...state, paddle: newPaddle };
}

function rectCollision(
  bx: number,
  by: number,
  br: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const closestX = Math.max(rx, Math.min(bx, rx + rw));
  const closestY = Math.max(ry, Math.min(by, ry + rh));
  const dx = bx - closestX;
  const dy = by - closestY;
  return dx * dx + dy * dy < br * br;
}

export function tick(state: BreakoutState, dt: number): BreakoutState {
  if (!state.launched || state.gameOver || state.won || state.paused) return state;

  // Clamp dt to avoid tunneling on tab-switch
  const clampedDt = Math.min(dt, 0.05);

  let { x, y, dx, dy, radius } = state.ball;
  x += dx * clampedDt;
  y += dy * clampedDt;

  // Wall collisions
  if (x - radius <= 0) {
    x = radius;
    dx = Math.abs(dx);
  } else if (x + radius >= state.canvasWidth) {
    x = state.canvasWidth - radius;
    dx = -Math.abs(dx);
  }
  if (y - radius <= 0) {
    y = radius;
    dy = Math.abs(dy);
  }

  // Paddle collision
  const p = state.paddle;
  if (
    dy > 0 &&
    rectCollision(x, y, radius, p.x, p.y, p.width, p.height)
  ) {
    // Where on the paddle did it hit? -1 (left) to 1 (right)
    const hitPos = ((x - p.x) / p.width) * 2 - 1;
    const speed = Math.sqrt(dx * dx + dy * dy);
    const maxAngle = Math.PI / 3; // 60 degrees
    const angle = hitPos * maxAngle;
    dx = speed * Math.sin(angle);
    dy = -speed * Math.cos(angle);
    y = p.y - radius - 0.1;
  }

  // Brick collisions
  let score = state.score;
  const bricks = state.bricks.map((b) => {
    if (!b.alive) return b;
    if (rectCollision(x, y, radius, b.x, b.y, b.width, b.height)) {
      // Determine bounce direction
      const overlapLeft = x + radius - b.x;
      const overlapRight = b.x + b.width - (x - radius);
      const overlapTop = y + radius - b.y;
      const overlapBottom = b.y + b.height - (y - radius);
      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        dx = -dx;
      } else {
        dy = -dy;
      }

      score += 10;
      return { ...b, alive: false };
    }
    return b;
  });

  const ball: Ball = { x, y, dx, dy, radius };

  // Ball below paddle — lose life
  if (y - radius > state.canvasHeight) {
    const newLives = state.lives - 1;
    if (newLives <= 0) {
      return { ...state, bricks, score, lives: 0, gameOver: true, ball };
    }
    // Reset ball onto paddle
    const resetBall: Ball = {
      x: state.paddle.x + state.paddle.width / 2,
      y: state.paddle.y - radius - 1,
      dx: 0,
      dy: 0,
      radius,
    };
    return {
      ...state,
      bricks,
      score,
      lives: newLives,
      ball: resetBall,
      launched: false,
    };
  }

  // Check win — all bricks dead
  const allDead = bricks.every((b) => !b.alive);
  if (allDead) {
    // Next level
    const nextLevel = state.level + 1;
    if (nextLevel > 10) {
      return { ...state, bricks, score, ball, won: true };
    }
    return createGame(
      state.canvasWidth,
      state.canvasHeight,
      nextLevel,
      score,
      state.lives,
    );
  }

  return { ...state, ball, bricks, score };
}
