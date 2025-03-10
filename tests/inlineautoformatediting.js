/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import InlineAutoformatEditing from '../src/inlineautoformatediting';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';

describe( 'InlineAutoformatEditing', () => {
	let editor, model, doc;

	testUtils.createSinonSandbox();

	beforeEach( () => {
		return VirtualTestEditor
			.create( {
				plugins: [ Enter, Paragraph ]
			} )
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				doc = model.document;

				model.schema.extend( '$text', { allowAttributes: 'testAttribute' } );
			} );
	} );

	describe( 'attribute', () => {
		it( 'should stop early if there are less than 3 capture groups', () => {
			new InlineAutoformatEditing( editor, /(\*)(.+?)\*/g, 'testAttribute' ); // eslint-disable-line no-new

			setData( model, '<paragraph>*foobar[]</paragraph>' );
			model.change( writer => {
				writer.insertText( '*', doc.selection.getFirstPosition() );
			} );

			expect( getData( model ) ).to.equal( '<paragraph>*foobar*[]</paragraph>' );
		} );

		it( 'should apply an attribute when the pattern is matched', () => {
			new InlineAutoformatEditing( editor, /(\*)(.+?)(\*)/g, 'testAttribute' ); // eslint-disable-line no-new

			setData( model, '<paragraph>*foobar[]</paragraph>' );
			model.change( writer => {
				writer.insertText( '*', doc.selection.getFirstPosition() );
			} );

			expect( getData( model ) ).to.equal( '<paragraph><$text testAttribute="true">foobar</$text>[]</paragraph>' );
		} );

		it( 'should stop early if selection is not collapsed', () => {
			new InlineAutoformatEditing( editor, /(\*)(.+?)\*/g, 'testAttribute' ); // eslint-disable-line no-new

			setData( model, '<paragraph>*foob[ar]</paragraph>' );
			model.change( writer => {
				writer.insertText( '*', doc.selection.getFirstPosition() );
			} );

			expect( getData( model ) ).to.equal( '<paragraph>*foob*[ar]</paragraph>' );
		} );
	} );

	describe( 'Callback', () => {
		it( 'should stop when there are no format ranges returned from testCallback', () => {
			const formatSpy = testUtils.sinon.spy();
			const testStub = testUtils.sinon.stub().returns( {
				format: [ [] ],
				remove: []
			} );

			new InlineAutoformatEditing( editor, testStub, formatSpy ); // eslint-disable-line no-new

			setData( model, '<paragraph>*[]</paragraph>' );
			model.change( writer => {
				writer.insertText( ' ', doc.selection.getFirstPosition() );
			} );

			sinon.assert.notCalled( formatSpy );
		} );

		it( 'should stop when there are no remove ranges returned from testCallback', () => {
			const formatSpy = testUtils.sinon.spy();
			const testStub = testUtils.sinon.stub().returns( {
				format: [],
				remove: [ [] ]
			} );

			new InlineAutoformatEditing( editor, testStub, formatSpy ); // eslint-disable-line no-new

			setData( model, '<paragraph>*[]</paragraph>' );
			model.change( writer => {
				writer.insertText( ' ', doc.selection.getFirstPosition() );
			} );

			sinon.assert.notCalled( formatSpy );
		} );

		it( 'should stop early when there is no text', () => {
			const formatSpy = testUtils.sinon.spy();
			const testStub = testUtils.sinon.stub().returns( {
				format: [],
				remove: [ [] ]
			} );

			new InlineAutoformatEditing( editor, testStub, formatSpy ); // eslint-disable-line no-new

			setData( model, '<paragraph>[]</paragraph>' );
			model.change( writer => {
				writer.insertText( ' ', doc.selection.getFirstPosition() );
			} );

			sinon.assert.notCalled( formatSpy );
		} );
	} );

	it( 'should ignore transparent batches', () => {
		new InlineAutoformatEditing( editor, /(\*)(.+?)(\*)/g, 'testAttribute' ); // eslint-disable-line no-new

		setData( model, '<paragraph>*foobar[]</paragraph>' );
		model.enqueueChange( 'transparent', writer => {
			writer.insertText( '*', doc.selection.getFirstPosition() );
		} );

		expect( getData( model ) ).to.equal( '<paragraph>*foobar*[]</paragraph>' );
	} );
} );
