/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module autoformat/inlineautoformatediting
 */

/**
 * The inline autoformatting engine. It allows to format various inline patterns. For example,
 * it can be configured to make "foo" bold when typed `**foo**` (the `**` markers will be removed).
 *
 * The autoformatting operation is integrated with the undo manager,
 * so the autoformatting step can be undone if the user's intention was not to format the text.
 *
 * See the constructors documentation to learn how to create custom inline autoformatters. You can also use
 * the {@link module:autoformat/autoformat~Autoformat} feature which enables a set of default autoformatters
 * (lists, headings, bold and italic).
 */
export default class InlineAutoformatEditing {
	/**
	 * Enables autoformatting mechanism for a given {@link module:core/editor/editor~Editor}.
	 *
	 * It formats the matched text by applying the given model attribute or by running the provided formatting callback.
	 * On every change applied to the model the autoformatting engine checks the text on the left of the selection
	 * and executes the provided action if the text matches given criteria (regular expression or callback).
	 *
	 * @param {module:core/editor/editor~Editor} editor The editor instance.
	 * @param {Function|RegExp} testRegexpOrCallback The regular expression or callback to execute on text.
	 * Provided regular expression *must* have three capture groups. The first and the third capture group
	 * should match opening and closing delimiters. The second capture group should match the text to format.
	 *
	 *		// Matches the `**bold text**` pattern.
	 *		// There are three capturing groups:
	 *		// - The first to match the starting `**` delimiter.
	 *		// - The second to match the text to format.
	 *		// - The third to match the ending `**` delimiter.
	 *		new InlineAutoformatEditing( editor, /(\*\*)([^\*]+?)(\*\*)$/g, 'bold' );
	 *
	 * When a function is provided instead of the regular expression, it will be executed with the text to match as a parameter.
	 * The function should return proper "ranges" to delete and format.
	 *
	 *		{
	 *			remove: [
	 *				[ 0, 1 ],	// Remove the first letter from the given text.
	 *				[ 5, 6 ]	// Remove the 6th letter from the given text.
	 *			],
	 *			format: [
	 *				[ 1, 5 ]	// Format all letters from 2nd to 5th.
	 *			]
	 *		}
	 *
	 * @param {Function|String} attributeOrCallback The name of attribute to apply on matching text or a callback for manual
	 * formatting.
	 *
	 *		// Use attribute name:
	 *		new InlineAutoformatEditing( editor, /(\*\*)([^\*]+?)(\*\*)$/g, 'bold' );
	 *
	 *		// Use formatting callback:
	 *		new InlineAutoformatEditing( editor, /(\*\*)([^\*]+?)(\*\*)$/g, ( writer, validRanges ) => {
	 *			for ( let range of validRanges ) {
	 *				writer.setAttribute( command, true, range );
	 *			}
	 *		} );
	 */
	constructor( editor, testRegexpOrCallback, attributeOrCallback ) {
		let regExp;
		let attributeKey;
		let testCallback;
		let formatCallback;

		if ( testRegexpOrCallback instanceof RegExp ) {
			regExp = testRegexpOrCallback;
		} else {
			testCallback = testRegexpOrCallback;
		}

		if ( typeof attributeOrCallback == 'string' ) {
			attributeKey = attributeOrCallback;
		} else {
			formatCallback = attributeOrCallback;
		}

		// A test callback run on changed text.
		testCallback = testCallback || ( text => {
			let result;
			const remove = [];
			const format = [];

			while ( ( result = regExp.exec( text ) ) !== null ) {
				// There should be full match and 3 capture groups.
				if ( result && result.length < 4 ) {
					break;
				}

				let {
					index,
					'1': leftDel,
					'2': content,
					'3': rightDel
				} = result;

				// Real matched string - there might be some non-capturing groups so we need to recalculate starting index.
				const found = leftDel + content + rightDel;
				index += result[ 0 ].length - found.length;

				// Start and End offsets of delimiters to remove.
				const delStart = [
					index,
					index + leftDel.length
				];
				const delEnd = [
					index + leftDel.length + content.length,
					index + leftDel.length + content.length + rightDel.length
				];

				remove.push( delStart );
				remove.push( delEnd );

				format.push( [ index + leftDel.length, index + leftDel.length + content.length ] );
			}

			return {
				remove,
				format
			};
		} );

		// A format callback run on matched text.
		formatCallback = formatCallback || ( ( writer, validRanges ) => {
			for ( const range of validRanges ) {
				writer.setAttribute( attributeKey, true, range );
			}

			// After applying attribute to the text, remove given attribute from the selection.
			// This way user is able to type a text without attribute used by auto formatter.
			writer.removeSelectionAttribute( attributeKey );
		} );

		editor.model.document.on( 'change', ( evt, batch ) => {
			if ( batch.type == 'transparent' ) {
				return;
			}

			const selection = editor.model.document.selection;

			// Do nothing if selection is not collapsed.
			if ( !selection.isCollapsed ) {
				return;
			}

			const changes = Array.from( editor.model.document.differ.getChanges() );
			const entry = changes[ 0 ];

			// Typing is represented by only a single change.
			if ( changes.length != 1 || entry.type !== 'insert' || entry.name != '$text' || entry.length != 1 ) {
				return;
			}

			const block = selection.focus.parent;
			const text = getText( block ).slice( 0, selection.focus.offset );
			const testOutput = testCallback( text );
			const rangesToFormat = testOutputToRanges( block, testOutput.format, editor.model );
			const rangesToRemove = testOutputToRanges( block, testOutput.remove, editor.model );

			if ( !( rangesToFormat.length && rangesToRemove.length ) ) {
				return;
			}

			// Use enqueueChange to create new batch to separate typing batch from the auto-format changes.
			editor.model.enqueueChange( writer => {
				const validRanges = editor.model.schema.getValidRanges( rangesToFormat, attributeKey );

				// Apply format.
				formatCallback( writer, validRanges );

				// Remove delimiters - use reversed order to not mix the offsets while removing.
				for ( const range of rangesToRemove.reverse() ) {
					writer.remove( range );
				}
			} );
		} );
	}
}

// Returns whole text from parent element by adding all data from text nodes together.
//
// @private
// @param {module:engine/model/element~Element} element
// @returns {String}
function getText( element ) {
	return Array.from( element.getChildren() ).reduce( ( a, b ) => a + b.data, '' );
}

// Converts output of the test function provided to the InlineAutoformatEditing and converts it to the model ranges
// inside provided block.
//
// @private
// @param {module:engine/model/element~Element} block
// @param {Array.<Array>} arrays
// @param {module:engine/model/model~Model} model
function testOutputToRanges( block, arrays, model ) {
	return arrays
		.filter( array => ( array[ 0 ] !== undefined && array[ 1 ] !== undefined ) )
		.map( array => {
			return model.createRange( model.createPositionAt( block, array[ 0 ] ), model.createPositionAt( block, array[ 1 ] ) );
		} );
}
