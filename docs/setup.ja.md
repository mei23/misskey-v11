Misskey構築の手引き
================================================================

Misskeyサーバーの構築にご関心をお寄せいただきありがとうございます！
このガイドではMisskeyのインストール・セットアップ方法について解説します。

----------------------------------------------------------------

*1.* Misskeyユーザーの作成
----------------------------------------------------------------
Misskeyはrootユーザーで実行しない方がよいため、代わりにユーザーを作成します。
Debianの例:

```
adduser --disabled-password --disabled-login misskey
```

*2.* 依存関係をインストールする
----------------------------------------------------------------
これらのソフトウェアをインストール・設定してください:

#### 依存関係
* [Node.js](https://nodejs.org/) (12以上)
* [PostgreSQL](https://www.postgresql.org/) (10以上)
* [Redis](https://redis.io/)
* [FFmpeg](https://www.ffmpeg.org/)

#### ビルド依存関係
* Git
* Yarn
* Python (v2 or v3)
* make および C/C++コンパイラーツール

※ Debian/Ubuntu系のディストリの場合、Node.js/Yarn 以外は以下で入ります。
```
apt -y install redis git build-essential ffmpeg postgresql
```

##### オプション
* [Elasticsearch](https://www.elastic.co/)
	* 検索機能を有効にするためにはインストールが必要です。

*3.* Misskeyのインストール
----------------------------------------------------------------
1. misskeyユーザーを使用

	`su - misskey`

2. masterブランチからMisskeyレポジトリをクローン

	`git clone -b master https://github.com/mei23/misskey-v11.git`

3. misskeyディレクトリに移動

	`cd misskey`

4. Misskeyの依存パッケージをインストール

	`NODE_ENV=production pnpm i`

*4.* Misskeyのビルド
----------------------------------------------------------------

次のコマンドでMisskeyをビルドしてください:

`NODE_ENV=production pnpm build`

*5.* 設定ファイルを作成する
----------------------------------------------------------------
1. `.config/example.yml`をコピーし名前を`default.yml`にする。

	`cp .config/example.yml .config/default.yml`

2. `default.yml` を編集する。

*6.* データベースを初期化
----------------------------------------------------------------
``` shell
pnpm migrate
```

*7.* 以上です！
----------------------------------------------------------------
お疲れ様でした。これでMisskeyを動かす準備は整いました。

### 通常起動
`NODE_ENV=production pnpm start`するだけです。GLHF!

### systemdを用いた起動
1. systemdサービスのファイルを作成

	`/etc/systemd/system/misskey.service`

2. エディタで開き、以下のコードを貼り付けて保存:

	```
	[Unit]
	Description=Misskey daemon

	[Service]
	Type=simple
	User=misskey
	ExecStart=/usr/bin/npm start
	WorkingDirectory=/home/misskey/misskey
	Environment="NODE_ENV=production"
	TimeoutSec=60
	StandardOutput=syslog
	StandardError=syslog
	SyslogIdentifier=misskey
	Restart=always

	[Install]
	WantedBy=multi-user.target
	```

3. systemdを再読み込みしmisskeyサービスを有効化

	`systemctl daemon-reload; systemctl enable misskey`

4. misskeyサービスの起動

	`systemctl start misskey`

`systemctl status misskey`と入力すると、サービスの状態を調べることができます。

### Misskeyを最新バージョンにアップデートする方法:
1. `git checkout master`
2. `git pull`
3. `NODE_ENV=production pnpm i`
4. `NODE_ENV=production pnpm build`
5. `pnpm migrate`

なにか問題が発生した場合は、`pnpm clean`または`pnpm cleanall`すると直る場合があります。

----------------------------------------------------------------

なにかお困りのことがありましたらお気軽にご連絡ください。
