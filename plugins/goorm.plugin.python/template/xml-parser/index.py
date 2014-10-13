#FROM: http://bunhere.tistory.com/209

from xml.sax import handler, parseString

class MyHandler(handler.ContentHandler):
    def startDocument(self):
        self.indentation = 0
        print 'start of document'

    def endDocument(self):
        print 'end of document'

    def startElement(self, name, attrs):
        self.indentation += 2
        i = " " * self.indentation
        print i + 'Start Tag:', name.encode('euc-kr')
        for name in attrs.getNames():
             print i + " ", name + " : " + attrs.getValue(name) 

    def endElement(self, name):
        i = " " * self.indentation
        print i + 'End Tag:', name.encode('euc-kr')
        self.indentation -= 2

    def characters(self, content):
        i = " " * (self.indentation + 2)
        print i + 'Location : (%s, %s)' % (self.locator.getLineNumber(), self.locator.getColumnNumber()) 
        print i + " " + 'Text :', content.replace('\n', '\\n').encode('euc-kr') 

    def setDocumentLocator(self, locator):
        self.locator = locator

h = MyHandler()
s = open('target.xml').read()
parseString(s, h)
