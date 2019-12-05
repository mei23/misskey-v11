# 装飾系

投稿などで以下の構文を使用することにより、いろいろな装飾ができます。

## カスタム絵文字
基本的にインスタンス管理者が登録する絵文字  
Misskey, Mastodon 全般で使える, AP連携あり

`:カスタム絵文字名:`

## 外部カスタム絵文字
外部インスタンスのカスタム絵文字を参照できる  
独自, 同じ対応をしているインスタンスとは連携できる

`:カスタム絵文字名@インスタンス:` 

## アバター絵文字
ユーザーアイコンを絵文字に出来る  
独自, 同じ対応をしているインスタンスとは連携できる

`:@user:`

`:@user@インスタンス:`

※ 絵文字の類は表示された投稿を選択してコピペできる

## Misskey標準文字装飾
MFMと呼ばれるMisskeyの文字装飾  
Misskey間では基本的に連携できる, 同じ対応をしているインスタンスとは連携できる

`**太字**`

`<center>中央揃え</center>`

`~~打ち消し線~~`

`<i>斜体</i>`

`<small>小さい字</small>`

`<motion>モーション</motion>`  

`(((モーション)))`

`*** ビッグ＋ ***`  

`<flip>左右反転</flip>`

```
<spin>回転</spin>
<spin right>右回転</spin>
<spin left>左回転</spin>
<spin alternate>往復回転</spin>
```

`<jump>ジャンプ</jump>`  

````
```
コードブロック
```
````

````
`インラインコード`
````

`> 引用行`

`検索 検索`

`[リンク](url)`

`?[詳細なしリンク](url)`

`【タイトル】`

`[タイトル]`

`\(インライン数式\)`

```
\[
ブロック数式
]\
```

## 独自追加文字装飾

```
<vflip>上下反転</vflip>

<rotate DEG>指定角度回転</rotate>
※ DEGは度

<xspin>X軸回転</xspin>
<yspin>Y軸回転</yspin>

<marquee>マーキー (右から左へ)</marquee>
<marquee reverse>マーキー (左から右へ)</marquee>
<marquee alternate>マーキー (往復)</marquee>
<marquee slide>マーキー (右から出てきて左で停止)</marquee>
<marquee reverse-slide>マーキー (左から出てきて右で停止)</marquee>
```

<div class="copyright"><small>Copyright (c) 2019 mei23</small></div>
