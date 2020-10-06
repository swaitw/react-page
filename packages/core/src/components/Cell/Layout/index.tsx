import * as React from 'react';

import {
  useCell,
  useCellData,
  useEditableId,
  useFocusCell,
  useIsEditMode,
  useIsFocused,
  useIsPreviewMode,
  useLang,
  useRemoveCell,
  useUpdateCellLayout,
} from '../../hooks';
import Row from '../../Row';

const Layout: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const node = useCell(nodeId);
  const lang = useLang();
  const editableId = useEditableId();
  const isPreviewMode = useIsPreviewMode();
  const isEditMode = useIsEditMode();

  const updateCellLayout = useUpdateCellLayout(node.id);
  const cellData = useCellData(node);

  const focus = useFocusCell(node.id);
  const focused = useIsFocused(node.id);

  const ref = React.useRef<HTMLDivElement>();
  const { Component } = node.layout.plugin;
  const remove = useRemoveCell(node.id);
  const onMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        !focused &&
        (e.target as HTMLDivElement).closest('.ory-cell-inner') ===
          // eslint-disable-next-line react/no-find-dom-node
          ref.current
      ) {
        focus(false, 'onMouseDown');
      }
      return true;
    },
    [node]
  );

  return (
    <div
      onMouseDown={!isPreviewMode ? onMouseDown : undefined}
      tabIndex={-1}
      className="ory-cell-inner"
      ref={ref}
    >
      <Component
        editable={editableId}
        cell={node}
        nodeId={nodeId}
        lang={lang}
        state={cellData}
        pluginConfig={node.layout.plugin}
        focused={isEditMode && focused}
        readOnly={!isEditMode}
        onChange={updateCellLayout}
        isEditMode={isEditMode}
        isPreviewMode={isPreviewMode}
        remove={remove}
      >
        {node.rows.map((r) => (
          <Row nodeId={r.id} key={r.id} />
        ))}
      </Component>
    </div>
  );
};

export default Layout;
