elasticsearch kopf
=======================

kopf is a simple web administration tool for [ElasticSearch](http://elasticsearch.org) written in JavaScript + AngularJS + jQuery + Twitter bootstrap.

it offers an easy way of performing common tasks on an elasticsearch cluster. not every single API is covered by this plugin, but it does offer a rest client which allows you to explore the full potential of the ElasticSearch API.

Versions
------------

| elasticsearch version | kopf version |
| --------------------- | ------------ |
| 0.90.X                | v0.90        |
| 1.X                   | master       |

Installation
------------


####Run locally:

    git clone git://github.com/lmenezes/elasticsearch-kopf.git
    cd elasticsearch-kopf
    git checkout {version}
    open index.html
    
ps: local execution doesn't work with Chrome(and maybe other browsers). See more [here](http://docs.angularjs.org/api/ng.directive:ngInclude).


####Install on a ElasticSearch instance:

    ./elasticsearch/bin/plugin --install lmenezes/elasticsearch-kopf/{version}
    open http://localhost:9200/_plugin/kopf
    

####Try it online:
```
http://lmenezes.com/elasticsearch-kopf/?location=http://localhost:9200
```

####Basic HTTP Auth support:
```
http://lmenezes.com/elasticsearch-kopf/?location=http://user:pwd@localhost:9200
```

if using https://github.com/Asquera/elasticsearch-http-basic, try:
```
http://lmenezes.com/elasticsearch-kopf/?location=http://user:pwd@localhost:9200//
```
The plugin modifies the base elasticsearch response and therefore this workaround is needed.

Screenshots
------------
####cluster overview
![cluster overview](imgs/cluster_view.png)

####header reflects cluster state
![cluster state](imgs/cluster_state.png)

####rest Client
![rest client](imgs/rest_client.png)

####aliases management
![aliases management](imgs/aliases.png)

####warmers management
![warmers management](imgs/warmer.png)

####percolator
![percolator](imgs/percolator.png)

####snapshots management
![snapshots management](imgs/snapshot.png)

####analysis api
![analysis api](imgs/analysis.png)
