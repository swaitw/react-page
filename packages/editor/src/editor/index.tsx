import {
  ContentPluginConfig,
  DndBackend,
  EditableType,
  LayoutPluginConfig,
  lazyLoad,
  Plugins
} from '@react-page/core';
import { HTMLRenderer } from '@react-page/renderer';
import React from 'react';
import { DisplayModes } from '@react-page/core/src/actions/display';

const EditableEditor = lazyLoad(() => import('./EditableEditor'));

type Props = {
  plugins?: Plugins;
  defaultPlugin?: ContentPluginConfig | LayoutPluginConfig;
  dndBackend?: DndBackend;
  value?: EditableType;
  onChange?: (v: EditableType) => void;
  readOnly?: boolean;
  defaultDisplayMode?: DisplayModes;
  blurGateDisabled?: boolean;
};
const Editor: React.FC<Props> = ({
  plugins,
  defaultPlugin,
  readOnly,
  value,
  onChange,
  dndBackend,
  blurGateDisabled,
  defaultDisplayMode,
}) =>
  readOnly ? (
    <HTMLRenderer state={value} plugins={plugins} />
  ) : (
    <EditableEditor
      plugins={plugins}
      defaultPlugin={defaultPlugin}
      value={value}
      onChange={onChange}
      dndBackend={dndBackend}
      blurGateDisabled={blurGateDisabled}
      defaultDisplayMode={defaultDisplayMode}
    />
  );

export default React.memo(Editor);
