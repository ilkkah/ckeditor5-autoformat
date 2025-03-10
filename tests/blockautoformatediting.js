/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import BlockAutoformatEditing from '../src/blockautoformatediting';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import Command from '@ckeditor/ckeditor5-core/src/command';

describe( 'BlockAutoformatEditing', () => {
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
			} );
	} );

	describe( 'Command name', () => {
		it( 'should run a command when the pattern is matched', () => {
			const spy = testUtils.sinon.spy();
			editor.commands.add( 'testCommand', new TestCommand( editor, spy ) );
			new BlockAutoformatEditing( editor, /^[*]\s$/, 'testCommand' ); // eslint-disable-line no-new

			setData( model, '<paragraph>*[]</paragraph>' );
			model.change( writer => {
				writer.insertText( ' ', doc.selection.getFirstPosition() );
			} );

			sinon.assert.calledOnce( spy );
		} );

		it( 'should remove found pattern', () => {
			const spy = testUtils.sinon.spy();
			editor.commands.add( 'testCommand', new TestCommand( editor, spy ) );
			new BlockAutoformatEditing( editor, /^[*]\s$/, 'testCommand' ); // eslint-disable-line no-new

			setData( model, '<paragraph>*[]</paragraph>' );
			model.change( writer => {
				writer.insertText( ' ', doc.selection.getFirstPosition() );
			} );

			sinon.assert.calledOnce( spy );
			expect( getData( model ) ).to.equal( '<paragraph>[]</paragraph>' );
		} );
	} );

	describe( 'Callback', () => {
		it( 'should run callback when the pattern is matched', () => {
			const spy = testUtils.sinon.spy();
			new BlockAutoformatEditing( editor, /^[*]\s$/, spy ); // eslint-disable-line no-new

			setData( model, '<paragraph>*[]</paragraph>' );
			model.change( writer => {
				writer.insertText( ' ', doc.selection.getFirstPosition() );
			} );

			sinon.assert.calledOnce( spy );
		} );

		it( 'should ignore other delta operations', () => {
			const spy = testUtils.sinon.spy();
			new BlockAutoformatEditing( editor, /^[*]\s/, spy ); // eslint-disable-line no-new

			setData( model, '<paragraph>*[]</paragraph>' );
			model.change( writer => {
				writer.remove( doc.selection.getFirstRange() );
			} );

			sinon.assert.notCalled( spy );
		} );

		it( 'should stop if there is no text to run matching on', () => {
			const spy = testUtils.sinon.spy();
			new BlockAutoformatEditing( editor, /^[*]\s/, spy ); // eslint-disable-line no-new

			setData( model, '<paragraph>[]</paragraph>' );
			model.change( writer => {
				writer.insertText( ' ', doc.selection.getFirstPosition() );
			} );

			sinon.assert.notCalled( spy );
		} );
	} );

	it( 'should ignore transparent batches', () => {
		const spy = testUtils.sinon.spy();
		new BlockAutoformatEditing( editor, /^[*]\s$/, spy ); // eslint-disable-line no-new

		setData( model, '<paragraph>*[]</paragraph>' );
		model.enqueueChange( 'transparent', writer => {
			writer.insertText( ' ', doc.selection.getFirstPosition() );
		} );

		sinon.assert.notCalled( spy );
	} );
} );

/**
 * Dummy command to execute.
 */
class TestCommand extends Command {
	/**
	 * Creates an instance of the command.
	 *
	 * @param {module:core/editor/editor~Editor} editor Editor instance.
	 * @param {Function} onExecuteCallback execute call hook
	 */
	constructor( editor, onExecuteCallback ) {
		super( editor );

		this.onExecute = onExecuteCallback;
	}

	/**
	 * Executes command.
	 *
	 * @protected
	 */
	execute() {
		this.onExecute();
	}
}
