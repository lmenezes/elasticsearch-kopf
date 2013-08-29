elasticsearch kopf
=======================

kopf is a simple web administration tool for ElasticSearch[(http://elasticsearch.org)] written in JavaScript + AngularJS + jQuery + Twitter bootstrap.

it offers an easy way of performing common tasks on an elasticsearch cluster. not every single API is covered by this plugin, but it does offer a rest client which allows you to explore the full potential of the ElasticSearch API.

Installation
------------

Run locally:

    git clone git://github.com/lmenezes/elasticsearch-kopf.git 
    cd elasticsearch-kopf
    open index.html

Install on a ElasticSearch instance:

    ./elasticsearch/bin/plugin -install lmenezes/elasticsearch-kopf
    open http://localhost:9200/_plugin/kopf

Screenshots
------------

![cluster overview](/imgs/cluster_view.png)
![rest client](/imgs/rest_client.png)
![aliases management](/imgs/aliases.png)
