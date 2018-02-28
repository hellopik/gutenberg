#!/usr/bin/env node

const gettextParser = require( 'gettext-parser' );
const _isEmpty = require( 'lodash/isEmpty' );
const path = require( 'path' );
const fs = require( 'fs' );

const TAB = '\t';
const NEWLINE = '\n';

const fileHeader = [
	'<?php',
	'/* THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY. */',
	'$generated_i18n_strings = array(',
].join( NEWLINE ) + NEWLINE;

const fileFooter = NEWLINE + [
	');',
	'/* THIS IS THE END OF THE GENERATED FILE */',
].join( NEWLINE ) + NEWLINE;

/**
 * Escapes single quotes.
 *
 * @param {string} input The string to be escaped.
 * @return {string} The escaped string.
 */
function escapeSingleQuotes( input ) {
	return input.replace( /'/g, '\\\'' );
}

/**
 * Converts a translation parsed from the POT file to lines of WP PHP.
 *
 * @param {Object} translation The translation to convert.
 * @param {string} textdomain The text domain to use in the WordPress translation function call.
 * @return {string} Lines of PHP that match the translation.
 */
function convertTranslationToPHP( translation, textdomain ) {
	let php = '';

	// The format of gettext-js matches the terminology in gettext itself.
	let original = translation.msgid;
	const comments = translation.comments;

	if ( ! _isEmpty( comments ) ) {
		if ( ! _isEmpty( comments.reference ) ) {
			// All references are split by newlines, add a // Reference prefix to make them tidy.
			php += TAB + '// Reference: ' +
				comments.reference
					.split( NEWLINE )
					.join( NEWLINE + TAB + '// Reference: ' ) +
				NEWLINE;
		}

		if ( ! _isEmpty( comments.extracted ) ) {
			// All extracted comments are split by newlines, add a tab to line them up nicely.
			const extracted = comments.extracted
				.split( NEWLINE )
				.join( NEWLINE + TAB + '   ' );

			php += TAB + `/* ${ extracted } */${ NEWLINE }`;
		}
	}

	if ( '' !== original ) {
		original = escapeSingleQuotes( original );

		if ( _isEmpty( translation.msgid_plural ) ) {
			php += TAB + `__( '${ original }', '${ textdomain }' )`;
		} else {
			const plural = escapeSingleQuotes( translation.msgid_plural );

			php += TAB + `_n_noop( '${ original }', '${ plural }', '${ textdomain }' )`;
		}
	}

	return php;
}

function convertPotToPHP( potFile, phpFile, options ) {
	const poContents = fs.readFileSync( potFile );
	const parsedPO = gettextParser.po.parse( poContents );

	const translations = parsedPO.translations[ '' ];

	const output = Object.values( translations )
		.map( ( translation ) => convertTranslationToPHP( translation, options.textdomain ) )
		.filter( php => php !== '' );

	const fileOutput = fileHeader + output.join( ',' + NEWLINE + NEWLINE ) + fileFooter;

	fs.writeFileSync( phpFile, fileOutput );
}

convertPotToPHP(
	path.join( __dirname, '../languages/gutenberg.pot' ),
	path.join( __dirname, '../languages/gutenberg-translations.php' ),
	{
		textdomain: 'gutenberg',
	}
);
