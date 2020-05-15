/*
 * Tests of toString
 *
 * How to run the tests:
 * > mocha test/toString.ts --require ts-node/register
 *
 * To specify test:
 * > mocha test/toString.ts --require ts-node/register -g 'test name'
 */
import * as assert from 'assert';
import { parse } from '../src/mfm/parse';
import { toString } from '../src/mfm/to-string';

describe('toString', () => {
	it('太字', () => {
		assert.deepStrictEqual(toString(parse('**太字**')), '**太字**');
	});
	it('中央揃え', () => {
		assert.deepStrictEqual(toString(parse('<center>中央揃え</center>')), '<center>中央揃え</center>');
	});
	it('打ち消し線', () => {
		assert.deepStrictEqual(toString(parse('~~打ち消し線~~')), '~~打ち消し線~~');
	});
	it('小さい字', () => {
		assert.deepStrictEqual(toString(parse('<small>小さい字</small>')), '<small>小さい字</small>');
	});
	it('モーション', () => {
		assert.deepStrictEqual(toString(parse('<motion>モーション</motion>')), '<motion>モーション</motion>');
	});
	it('モーション2', () => {
		assert.deepStrictEqual(toString(parse('(((モーション)))')), '<motion>モーション</motion>');
	});
	it('ビッグ＋', () => {
		assert.deepStrictEqual(toString(parse('*** ビッグ＋ ***')), '*** ビッグ＋ ***');
	});
	it('回転', () => {
		assert.deepStrictEqual(toString(parse('<spin>回転</spin>')), '<spin>回転</spin>');
	});
	it('右回転', () => {
		assert.deepStrictEqual(toString(parse('<spin right>右回転</spin>')), '<spin right>右回転</spin>');
	});
	it('左回転', () => {
		assert.deepStrictEqual(toString(parse('<spin left>左回転</spin>')), '<spin left>左回転</spin>');
	});
	it('往復回転', () => {
		assert.deepStrictEqual(toString(parse('<spin alternate>往復回転</spin>')), '<spin alternate>往復回転</spin>');
	});
	it('ジャンプ', () => {
		assert.deepStrictEqual(toString(parse('<jump>ジャンプ</jump>')), '<jump>ジャンプ</jump>');
	});
	it('コードブロック', () => {
		assert.deepStrictEqual(toString(parse('```\nコードブロック\n```')), '```\nコードブロック\n```');
	});
	it('インラインコード', () => {
		assert.deepStrictEqual(toString(parse('`インラインコード`')), '`インラインコード`');
	});
	it('引用行', () => {
		assert.deepStrictEqual(toString(parse('>引用行')), '>引用行');
	});
	it('検索', () => {
		assert.deepStrictEqual(toString(parse('検索 [search]')), '検索 [search]');
	});
	it('リンク', () => {
		assert.deepStrictEqual(toString(parse('[リンク](http://example.com)')), '[リンク](http://example.com)');
	});
	it('詳細なしリンク', () => {
		assert.deepStrictEqual(toString(parse('?[詳細なしリンク](http://example.com)')), '?[詳細なしリンク](http://example.com)');
	});
	it('【タイトル】', () => {
		assert.deepStrictEqual(toString(parse('【タイトル】')), '[タイトル]');
	});
	it('[タイトル]', () => {
		assert.deepStrictEqual(toString(parse('[タイトル]')), '[タイトル]');
	});
	it('インライン数式', () => {
		assert.deepStrictEqual(toString(parse('\\(インライン数式\\)')), '\\(インライン数式\\)');
	});
	it('ブロック数式', () => {
		assert.deepStrictEqual(toString(parse('\\\[\nブロック数式\n\]\\')), '\\\[\nブロック数式\n\]\\');
	});
	it('上下反転', () => {
		assert.deepStrictEqual(toString(parse('<vflip>上下反転</vflip>')), '<vflip>上下反転</vflip>');
	});
	it('指定角度回転', () => {
		assert.deepStrictEqual(toString(parse('<rotate 30>指定角度回転</rotate>')), '<rotate 30>指定角度回転</rotate>');
	});
	it('X軸回転', () => {
		assert.deepStrictEqual(toString(parse('<xspin>X軸回転</xspin>')), '<xspin>X軸回転</xspin>');
	});
	it('Y軸回転', () => {
		assert.deepStrictEqual(toString(parse('<yspin>Y軸回転</yspin>')), '<yspin>Y軸回転</yspin>');
	});
	it('マーキー', () => {
		assert.deepStrictEqual(toString(parse('<marquee>マーキー (右から左へ)</marquee>')), '<marquee>マーキー (右から左へ)</marquee>');
	});
	it('マーキー2', () => {
		assert.deepStrictEqual(toString(parse('<marquee reverse>マーキー (左から右へ)</marquee>')), '<marquee reverse>マーキー (左から右へ)</marquee>');
	});
	it('マーキー3', () => {
		assert.deepStrictEqual(toString(parse('<marquee reverse-slide>マーキー (左から出てきて右で停止)</marquee>')), '<marquee reverse-slide>マーキー (左から出てきて右で停止)</marquee>');
	});
});
