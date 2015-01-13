project.goorm
=========================

goorm is an open source cloud-based IDE written in Javascript. goorm currently supports C/C++, Java and PHP, as well as HTML, CSS and Javascript. Support for other languages will be provided in the future through goorm's plugin system.

* **goorm is currently in its beta stage and still actively developed.**
* **Please contact us about bugs and feature requests, your feedback is important to us. (email: sungtae.ryu@goorm.io)**

Official Site
-------------

* http://goorm.io

Features
--------

* **Host your own custom cloud-based IDE.**
* **Easily extendable through an integrated plugin system.**
* **Allows real-time collaboration with other developers**
* **Supports syntax highlighting for a number of languages**
* **Powerful search/replace functions**
* **Git and Subversion integration**
* **Included terminal utility**

Installation via npm:
---------------------

    $ npm install goorm -g

Installation from source:
-------------------------

* **node.js installation**

  Install node.js:

          $ wget http://nodejs.org/dist/v0.10.21/node-v0.10.21.tar.gz
          $ tar -xvzf node-v0.10.21.tar.gz
          $ cd node-v0.10.21
          $ ./configure
          $ make
          $ sudo make install

  Make sure that node.js is working:

          $ node -v

  If the installation was successfull, it should print the following string:

          $ v0.10.21

  Install npm (optional - The latest version of node.js includes npm by default):

          $ wget https://npmjs.org/install.sh
          $ sudo sh install.sh

* **goorm installation**

  Clone goorm (git) :

          $ git clone git://github.com/xenoz0718/goorm.git

  Checkout goorm (svn) :

          $ svn checkout svn://svn.code.sf.net/p/goorm/code/trunk goorm

  or using npm :

          $ npm install goorm -g


* **Running goorm**

  Run mongodb:

          $ mongod

  The command should print the following information to the console:

          ...
          Thu Oct  4 23:26:15 [websvr] admin web console waiting for connections on port 28017
          Thu Oct  4 23:26:15 [initandlisten] waiting for connections on port 27017
          ...

  Run goorm.js :

          $ node goorm.js start

  Run goorm.js (through npm) :

          $ goorm start

  Run goorm daemon :

          $ node goorm.js start -d
          $ goorm start -d

  Configuration (optional) :

          $ node goorm.js set --workspace ~/workspace/
          $ goorm set -w ~/workspace/

          $ node goorm.js set --temp-directory ~/temp_files/
          $ goorm set -t ~/temp_files/

          $ node goorm.js set -x plugin_exclude_list
          $ goorm set --plugin_exclude_list [plugin_exclude_list]

          $ node goorm.js set -u [user_id]
          $ goorm set --user [user_id]

  Stop goorm daemon :

          $ node goorm.js stop
          $ goorm stop

  Once started, goorm should display the following information:

          goormIDE:: loading config...
          /--------------------------------------------------------
          workspace_path: /Users/goormUser/workspace/
          temp_dir_path: /Users/goormUser/temp_files/
          goormIDE:: starting...
          /--------------------------------------------------------
          info  - socket.io started
          goorm IDE server listening on port 9999 in development mode
          Open your browser and connect to
          'http://localhost:9999' or 'http://[YOUR IP/DOMAIN]:9999'

  Run goorm.js:

          $ node goorm.js

  Goorm can now be accessed in your webbrowser (Google Chrome highly recommended):

          http://localhost:9999

License
-------

goormIDE is dual licensed under the AGPL v3 and a commercial license. Modified versions of goorm are required to publish their source code using the same license.

If you want to use goorm commercially, please contact us for licensing details: contact@goorm.io
