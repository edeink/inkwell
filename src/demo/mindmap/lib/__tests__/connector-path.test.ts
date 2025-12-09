import { describe, expect, it } from 'vitest';

import {
  bezierRoute,
  connectorPathFromRects,
  ConnectorStyle,
  DEFAULT_CONNECTOR_OPTIONS,
  elbowRoute,
} from '../../helpers/connection-drawer';

const A = { x: 10, y: 10, width: 120, height: 40 };
const B = { x: 260, y: 180, width: 120, height: 40 };

describe('connectorPathFromRects', () => {
  it('bezier equals specialized bezierRoute with defaults', () => {
    const pts1 = connectorPathFromRects(A, B, {
      style: ConnectorStyle.Bezier,
      samples: DEFAULT_CONNECTOR_OPTIONS.samples,
      margin: DEFAULT_CONNECTOR_OPTIONS.margin,
      elbowRadius: DEFAULT_CONNECTOR_OPTIONS.elbowRadius,
      arcSegments: DEFAULT_CONNECTOR_OPTIONS.arcSegments,
    });
    const pts2 = bezierRoute(
      A,
      B,
      DEFAULT_CONNECTOR_OPTIONS.samples,
      DEFAULT_CONNECTOR_OPTIONS.margin,
    );
    expect(pts1.length).toBe(pts2.length);
    expect(`${pts1[0].x.toFixed(1)},${pts1[0].y.toFixed(1)}`).toBe(
      `${pts2[0].x.toFixed(1)},${pts2[0].y.toFixed(1)}`,
    );
    expect(`${pts1.at(-1)!.x.toFixed(1)},${pts1.at(-1)!.y.toFixed(1)}`).toBe(
      `${pts2.at(-1)!.x.toFixed(1)},${pts2.at(-1)!.y.toFixed(1)}`,
    );
  });

  it('elbow equals specialized elbowRoute when radius=0', () => {
    const pts1 = connectorPathFromRects(A, B, {
      style: ConnectorStyle.Elbow,
      margin: 0,
      samples: 8,
      elbowRadius: 0,
    });
    const pts2 = elbowRoute(A, B);
    expect(pts1.length).toBe(pts2.length);
    expect(`${pts1[1].x.toFixed(1)},${pts1[1].y.toFixed(1)}`).toBe(
      `${pts2[1].x.toFixed(1)},${pts2[1].y.toFixed(1)}`,
    );
  });

  it('elbowRounded produces more points and rounded corners', () => {
    const pts = connectorPathFromRects(A, B, {
      style: ConnectorStyle.ElbowRounded,
      margin: DEFAULT_CONNECTOR_OPTIONS.margin,
      elbowRadius: DEFAULT_CONNECTOR_OPTIONS.elbowRadius,
      arcSegments: DEFAULT_CONNECTOR_OPTIONS.arcSegments,
    });
    expect(pts.length).toBeGreaterThan(8);
    const midIndex = Math.floor(pts.length / 2);
    expect(pts[midIndex].x).toBeGreaterThan(10);
  });
});
