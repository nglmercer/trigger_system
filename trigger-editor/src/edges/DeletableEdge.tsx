import * as React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { TrashIcon, TrashIconOpen } from '../components/Icons';
import { useIsMobile } from '../hooks/useMediaQuery.ts';

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const isMobile = useIsMobile();
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [isHovered, setIsHovered] = React.useState(false);

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  const onMouseEnter = () => !isMobile && setIsHovered(true);
  const onMouseLeave = () => !isMobile && setIsHovered(false);

  // We only show the delete button when the edge is selected OR hovered
  // On mobile, hover is sticky/non-existent, so we only use selection
  const isVisible = selected || (isHovered && !isMobile);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Invisible wider path to catch hover/click events easily */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      />
      {isVisible && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
            >
            <button
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onPointerEnter={onMouseEnter}
              onPointerLeave={onMouseLeave}
              className="edge-delete-btn"
              onClick={onEdgeClick}
              title="Delete Edge"
            >
              {isHovered ? <TrashIconOpen size={14} /> : <TrashIcon size={14} />}
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
