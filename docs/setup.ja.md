Misskey構築の手引き
================================================================

Misskeyサーバーの構築にご関心をお寄せいただきありがとうございます！
このガイドではMisskeyのインストール・セットアップ方法について解説します。

----------------------------------------------------------------

## セットアップ方法は以下参照
https://github.com/mei23/memo/blob/master/misskey/Setup-Ubuntu1804-Quick.md

----------------------------------------------------------------

### systemdを用いた起動
1. systemdサービスのファイルを作成

	`/etc/systemd/system/misskey.service`

2. エディタで開き、以下のコードを貼り付けて保存:

	[misskey.service](examples/misskey.service)

3. systemdを再読み込みしmisskeyサービスを有効化

	`systemctl daemon-reload ; systemctl enable misskey`

4. misskeyサービスの起動

	`systemctl start misskey`

`systemctl status misskey`と入力すると、サービスの状態を調べることができます。

----------------------------------------------------------------

なにかお困りのことがありましたらお気軽にご連絡ください。
