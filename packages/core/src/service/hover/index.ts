import { isRow, Node } from '../../types/editable';
import {
  Callbacks,
  Matrix,
  MatrixIndex,
  Room,
  Vector,
} from '../../types/hover';
import deepEquals from '../../utils/deepEquals';
import logger from '../logger';

type Context = {
  room: Room;
  mouse: Vector;
  position: MatrixIndex;
  size: {
    rows: number;
    cells: number;
  };
  scale: Vector;
};
export type MatrixList = { [key: string]: Matrix };
export type CallbackList = {
  [key: number]: (
    drag: Node,
    hover: Node,
    actions: Callbacks,
    context: Context
  ) => void;
};

/**
 * NO (None): No drop zone.
 *
 * Corners are counted clockwise, beginning top left
 * C1 (Corner top left): Position decided by top left corner function
 * C2 (Corner top right): Position decided by top right corner function
 * C3 (Corner bottom right): Position decided by bottom right corner function
 * C4 (Corner bottom left): Position decided by bottom left corner function
 *
 * Above:
 * AH (Above here): above, same level
 * AA (Above of self or some ancestor): Above, compute active level using classification functions, e.g. log, sin, mx + t
 *
 * Below:
 * BH (Below here)
 * BA (Below of self or some ancestor)
 *
 * Left of:
 * LH (Left of here)
 * LA (Left of self or some ancestor)
 *
 * Right of:
 * RH (Right of here)
 * RA (Right of self or some ancestor)
 *
 * Inside / inline
 * IL (Inline left)
 * IR (Inline right)
 */
export const classes: { [key: string]: number } = {
  NO: 0,

  C1: 10,
  C2: 11,
  C3: 12,
  C4: 13,

  AH: 200,
  AA: 201,

  BH: 210,
  BA: 211,

  LH: 220,
  LA: 221,

  RH: 230,
  RA: 231,

  IL: 300,
  IR: 301,
};

const c = classes;

/**
 * A list of matrices that are used to define the callback function.
 *
 * @type {{6x6: *[], 10x10: *[], 10x10-no-inline: *[]}}
 */
export const defaultMatrices: MatrixList = {
  '6x6': [
    [c.C1, c.AA, c.AA, c.AA, c.AA, c.C2],
    [c.LA, c.IL, c.AH, c.AH, c.IR, c.RA],
    [c.LA, c.LH, c.NO, c.NO, c.RH, c.RA],
    [c.LA, c.LH, c.NO, c.NO, c.RH, c.RA],
    [c.LA, c.C4, c.BH, c.BH, c.C3, c.RA],
    [c.C4, c.BA, c.BA, c.BA, c.BA, c.C3],
  ],
  '10x10': [
    [c.C1, c.AA, c.AA, c.AA, c.AA, c.AA, c.AA, c.AA, c.AA, c.C2],
    [c.LA, c.IL, c.IL, c.IL, c.AH, c.AH, c.IR, c.IR, c.IR, c.RA],
    [c.LA, c.IL, c.IL, c.IL, c.AH, c.AH, c.IR, c.IR, c.IR, c.RA],
    [c.LA, c.IL, c.IL, c.IL, c.AH, c.AH, c.IR, c.IR, c.IR, c.RA],
    [c.LA, c.LH, c.LH, c.LH, c.C1, c.C2, c.RH, c.RH, c.RH, c.RA],
    [c.LA, c.LH, c.LH, c.LH, c.C4, c.C3, c.RH, c.RH, c.RH, c.RA],
    [c.LA, c.LH, c.LH, c.C4, c.BH, c.BH, c.C3, c.IR, c.RH, c.RA],
    [c.LA, c.LH, c.C4, c.BH, c.BH, c.BH, c.BH, c.C3, c.RH, c.RA],
    [c.LA, c.C4, c.BH, c.BH, c.BH, c.BH, c.BH, c.BH, c.C3, c.RA],
    [c.C4, c.BA, c.BA, c.BA, c.BA, c.BA, c.BA, c.BA, c.BA, c.C3],
  ],
  '10x10-no-inline': [
    [c.C1, c.AA, c.AA, c.AA, c.AA, c.AA, c.AA, c.AA, c.AA, c.C2],
    [c.LA, c.C1, c.AH, c.AH, c.AH, c.AH, c.AH, c.AH, c.C2, c.RA],
    [c.LA, c.LH, c.C1, c.AH, c.AH, c.AH, c.AH, c.C2, c.RH, c.RA],
    [c.LA, c.LH, c.LH, c.C1, c.AH, c.AH, c.C2, c.RH, c.RH, c.RA],
    [c.LA, c.LH, c.LH, c.LH, c.C1, c.C2, c.RH, c.RH, c.RH, c.RA],
    [c.LA, c.LH, c.LH, c.LH, c.C4, c.C3, c.RH, c.RH, c.RH, c.RA],
    [c.LA, c.LH, c.LH, c.C4, c.BH, c.BH, c.C3, c.RH, c.RH, c.RA],
    [c.LA, c.LH, c.C4, c.BH, c.BH, c.BH, c.BH, c.C3, c.RH, c.RA],
    [c.LA, c.C4, c.BH, c.BH, c.BH, c.BH, c.BH, c.BH, c.C3, c.RA],
    [c.C4, c.BA, c.BA, c.BA, c.BA, c.BA, c.BA, c.BA, c.BA, c.C3],
  ],
};

/**
 * Computes the average width and height for cells in a room.
 *
 * @param room
 * @param matrix
 * @returns {{x: number, y: number}}
 */
export const getRoomScale = ({
  room,
  matrix,
}: {
  room: Room;
  matrix: Matrix;
}): Vector => {
  const rows = matrix.length;
  const cells = matrix[0].length;

  const scalingX = room.width / cells;
  const scalingY = room.height / rows;

  return {
    x: scalingX,
    y: scalingY,
  };
};

/**
 * Returns the index of the hover cell.
 *
 * @param mouse
 * @param scale
 */
export const getMouseHoverCell = ({
  mouse,
  scale,
}: {
  mouse: Vector;
  scale: Vector;
}): MatrixIndex => ({
  cell: Math.floor(mouse.x / scale.x),
  row: Math.floor(mouse.y / scale.y),
});

/**
 * Used for caching.
 */
const last = { '10x10': null, '10x10-no-inline': null };

const computeHover = (
  drag: Node,
  hover: Node,
  actions: Callbacks,
  {
    room,
    mouse,
    matrix,
    callbacks,
  }: {
    room: Room;
    mouse: Vector;
    callbacks: CallbackList;
    matrix: Matrix;
  },
  m: string
) => {
  const scale = getRoomScale({ room, matrix });
  const hoverCell = getMouseHoverCell({ mouse, scale });
  const rows = matrix.length;
  const cells = matrix[0].length;

  if (hoverCell.row >= rows) {
    hoverCell.row = rows - 1;
  } else if (hoverCell.row < 0) {
    hoverCell.row = 0;
  }

  if (hoverCell.cell >= cells) {
    hoverCell.cell = cells - 1;
  } else if (hoverCell.cell < 0) {
    hoverCell.cell = 0;
  }

  const cell = matrix[hoverCell.row][hoverCell.cell];
  if (!callbacks[cell]) {
    logger.error('Matrix callback not found.', {
      room,
      mouse,
      matrix,
      scale,
      hoverCell,
      rows,
      cells,
    });
    return;
  }

  const all = {
    item: drag.id,
    hover: hover.id,
    actions,
    ctx: {
      room,
      mouse,
      position: hoverCell,
      size: { rows, cells },
      scale,
    },
  };
  if (deepEquals(all, last[m])) {
    return;
  }
  last[m] = all;

  return callbacks[cell](drag, hover, actions, {
    room,
    mouse,
    position: hoverCell,
    size: { rows, cells },
    scale,
  });
};

/**
 * Return the mouse position relative to the cell.
 */
export const relativeMousePosition = ({
  mouse,
  position,
  scale,
}: {
  mouse: Vector;
  scale: Vector;
  position: MatrixIndex;
}) => ({
  x: Math.round(mouse.x - position.cell * scale.x),
  y: Math.round(mouse.y - position.row * scale.y),
});

/**
 * Computes the drop level based on the mouse position and the cell width.
 */
export const computeLevel = ({
  size,
  levels,
  position,
}: {
  size: number;
  levels: number;
  position: number;
}) => {
  if (size <= (levels + 1) * 2) {
    return Math.round(position / (size / levels));
  }

  const spare = size - (levels + 1) * 2;
  const steps = [0];
  let current = spare;
  for (let i = 0; i <= levels; i++) {
    steps.push(steps[i] + current / 2);
    current /= 2;
    if (position >= steps[i] + i * 2 && position < steps[i + 1] + (i + 1) * 2) {
      return i;
    }
  }

  return levels;
};

/**
 * Computes the horizontal drop level based on the mouse position.
 *
 * @param mouse
 * @param position
 * @param hover
 * @param scale
 * @param level
 * @param inv returns the inverse drop level. Usually true for left and above drop level computation.
 * @returns number
 */
export const computeHorizontal = (
  {
    mouse,
    position,
    hover,
    scale,
    level,
  }: {
    mouse: Vector;
    position: MatrixIndex;
    scale: Vector;
    level: number;
    hover: Node;
  },
  inv = false
) => {
  const x = relativeMousePosition({ mouse, position, scale }).x;
  let at = computeLevel({ size: scale.x, position: x, levels: level });

  if (isRow(hover)) {
    // Is row, always opt for lowest level
    return level;
  }

  // If the hovered element is an inline element, level 0 would be directly besides it which doesn't work.
  // Set it to 1 instead.
  if (hover.inline && at === 0) {
    at = 1;
  }

  return inv ? level - at : at;
};

/**
 * Computes the vertical drop level based on the mouse position.
 *
 * @returns number
 */
const computeVertical = (
  {
    level,
    mouse,
    hover,
    position,
    scale,
  }: {
    level: number;
    mouse: Vector;
    hover: Node;
    position: MatrixIndex;
    scale: Vector;
  },
  inv = false
) => {
  const y = relativeMousePosition({ mouse, position, scale }).y;
  let at = computeLevel({ size: scale.y, position: y, levels: level });

  if (isRow(hover)) {
    // Is row, always opt for lowest level
    return level;
  }

  // If the hovered element is an inline element, level 0 would be directly besides it which doesn't work.
  // Set it to 1 instead.
  if (hover.inline && at === 0) {
    at = 1;
  }

  return inv ? level - at : at;
};

const getDropLevel = (hover: Node) => (!isRow(hover) && hover.inline ? 1 : 0);

/**
 * A list of callbacks.
 */
export const defaultCallbacks: CallbackList = {
  [c.NO]: (item: Node, hover: Node, { clear }: Callbacks) => clear(),

  /* corners */
  [c.C1]: (
    item: Node,
    hover: Node,
    { leftOf, above }: Callbacks,

    ctx: Context
  ) => {
    const mouse = relativeMousePosition(ctx);
    const level = getDropLevel(hover);

    if (mouse.x < mouse.y) {
      return leftOf(item, hover, level);
    }

    above(item, hover, level);
  },

  [c.C2]: (
    item: Node,
    hover: Node,
    { rightOf, above }: Callbacks,

    ctx: Context
  ) => {
    const mouse = relativeMousePosition(ctx);
    const level = getDropLevel(hover);

    if (mouse.x > mouse.y) {
      return rightOf(item, hover, level);
    }

    above(item, hover, level);
  },

  [c.C3]: (
    item: Node,
    hover: Node,
    { rightOf, below }: Callbacks,

    ctx: Context
  ) => {
    const mouse = relativeMousePosition(ctx);
    const level = getDropLevel(hover);

    if (mouse.x > mouse.y) {
      return rightOf(item, hover, level);
    }
    below(item, hover, level);
  },

  [c.C4]: (
    item: Node,
    hover: Node,
    { leftOf, below }: Callbacks,

    ctx: Context
  ) => {
    const mouse = relativeMousePosition(ctx);
    const level = getDropLevel(hover);

    if (mouse.x < mouse.y) {
      return leftOf(item, hover, level);
    }
    below(item, hover, level);
  },

  /* heres */
  [c.AH]: (item: Node, hover: Node, { above }: Callbacks) => {
    const level = getDropLevel(hover);
    above(item, hover, level);
  },
  [c.BH]: (item: Node, hover: Node, { below }: Callbacks) => {
    const level = getDropLevel(hover);
    below(item, hover, level);
  },

  [c.LH]: (item: Node, hover: Node, { leftOf }: Callbacks) => {
    const level = getDropLevel(hover);
    leftOf(item, hover, level);
  },
  [c.RH]: (item: Node, hover: Node, { rightOf }: Callbacks) => {
    const level = getDropLevel(hover);
    rightOf(item, hover, level);
  },

  /* ancestors */
  [c.AA]: (item: Node, hover: Node, { above }: Callbacks, ctx: Context) =>
    above(
      item,
      hover,
      computeVertical(
        {
          ...ctx,
          hover: hover,
          level: hover.levels.above,
        },
        true
      )
    ),
  [c.BA]: (item: Node, hover: Node, { below }: Callbacks, ctx: Context) =>
    below(
      item,
      hover,
      computeVertical({
        ...ctx,
        hover,
        level: hover.levels.below,
      })
    ),

  [c.LA]: (item: Node, hover: Node, { leftOf }: Callbacks, ctx: Context) =>
    leftOf(
      item,
      hover,
      computeHorizontal(
        {
          ...ctx,
          hover,
          level: hover.levels.left,
        },
        true
      )
    ),
  [c.RA]: (item: Node, hover: Node, { rightOf }: Callbacks, ctx: Context) =>
    rightOf(
      item,
      hover,
      computeHorizontal({
        ...ctx,
        hover,
        level: hover.levels.right,
      })
    ),

  /* inline */
  [c.IL]: (item: Node, hover: Node, { inlineLeft, leftOf }: Callbacks) => {
    if (isRow(item) || isRow(hover)) {
      return;
    }
    const { inline, hasInlineNeighbour } = hover;
    const { content: { plugin: { isInlineable = false } = {} } = {} } = item;
    if (inline || !isInlineable) {
      return leftOf(item, hover, 2);
    }
    if (hasInlineNeighbour && hasInlineNeighbour !== item.id) {
      return leftOf(item, hover, 2);
    }
    if (
      hasInlineNeighbour &&
      hasInlineNeighbour === item.id &&
      item.inline === 'left'
    ) {
      return leftOf(item, hover, 2);
    }

    inlineLeft(item, hover);
  },

  [c.IR]: (item: Node, hover: Node, { inlineRight, rightOf }: Callbacks) => {
    if (isRow(item) || isRow(hover)) {
      return;
    }
    const { inline, hasInlineNeighbour } = hover;
    const { content: { plugin: { isInlineable = false } = {} } = {} } = item;
    if (inline || !isInlineable) {
      return rightOf(item, hover, 2);
    }
    if (hasInlineNeighbour && hasInlineNeighbour !== item.id) {
      return rightOf(item, hover, 2);
    }
    if (
      hasInlineNeighbour &&
      hasInlineNeighbour === item.id &&
      item.inline === 'right'
    ) {
      return rightOf(item, hover, 2);
    }

    inlineRight(item, hover);
  },
};

export type HoverServiceProps = {
  matrices?: MatrixList;
  callbacks?: CallbackList;
};

/**
 * The HoverService uses callbacks and matrices to compute hover logic.
 *
 * @class HoverService
 */
export default class HoverService {
  callbacks: CallbackList = defaultCallbacks;
  matrices: MatrixList = defaultMatrices;

  constructor(
    { matrices, callbacks }: HoverServiceProps = {} as HoverServiceProps
  ) {
    this.matrices = matrices || this.matrices;
    this.callbacks = callbacks || this.callbacks;
  }

  hover(
    drag: Node,
    hover: Node,
    actions: Callbacks,
    {
      room,
      mouse,
      matrix: use = '10x10',
    }: { room: Room; mouse: Vector; matrix: string }
  ) {
    return computeHover(
      drag,
      hover,
      actions,
      {
        room,
        mouse,
        matrix: this.matrices[use],
        callbacks: this.callbacks,
      },
      use
    );
  }
}
