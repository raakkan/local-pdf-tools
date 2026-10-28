import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '@localpdf/ui';
import {platform} from './platform';
import '../../../packages/ui/src/styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App platform={platform}/></React.StrictMode>);
