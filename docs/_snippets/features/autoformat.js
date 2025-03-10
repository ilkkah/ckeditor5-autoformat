/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-build-classic/src/ckeditor';
import Code from '@ckeditor/ckeditor5-basic-styles/src/code';
import { CS_CONFIG } from '@ckeditor/ckeditor5-cloud-services/tests/_utils/cloud-services-config';

ClassicEditor
	.create( document.querySelector( '#snippet-autoformat' ), {
		plugins: ClassicEditor.builtinPlugins.concat( [ Code ] ),
		toolbar: {
			items: [
				'heading',
				'|',
				'bold',
				'italic',
				'code',
				'link',
				'bulletedList',
				'numberedList',
				'blockQuote',
				'undo',
				'redo'
			],
			viewportTopOffset: window.getViewportTopOffsetConfig()
		},
		cloudServices: CS_CONFIG
	} )
	.then( editor => {
		window.editorBasic = editor;
	} )
	.catch( err => {
		console.error( err );
	} );
