var api_keys = {
	facebook: ['API_KEY_HERE'],
	twitter: 'API_KEY_HERE',
	ahrefs: 'API_KEY_HERE'
}

var getApi = function(url, platform) {
	var hostName = function(url) {
		var hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0]
		return hostname.split(':')[0].split('?')[0];
	}
	var request = function(url, payload) {
		payload = typeof payload === 'undefined' ? null : payload
		try {
			return Utilities.jsonParse(UrlFetchApp.fetch(url, payload).getContentText());
		} catch (err) {
			Logger.log(err);
			return false
		}
	}
	var endpoints = {
		"facebook": function(url) {
			var keys = api_keys.facebook,
				r = false,
				i = 0;
			while (!r && !r.hasOwnProperty("engagement") && i < keys.length) {
				r = request("https://graph.facebook.com/v3.3/?id=" + encodeURIComponent(url) + "&access_token=" + encodeURIComponent(keys[i]) + "&fields=engagement");
				i++;
			}
			return !r ? r : r.hasOwnProperty("engagement") ? r.engagement.share_count : r;
		},
		"twitter": function(url) {
			var r = request("https://api.buzzsumo.com/search/articles.json?q=" + encodeURIComponent(url) + "&api_key=" + api_keys.twitter)
			return r.hasOwnProperty("results") && r.results.length > 0 ? r.results[0].twitter_shares : "";
		},
		"ahrefs": function(url) {
			var options = {
					"target": hostName(url),
					"from": "domain_rating",
					"mode": "domain",
					"output": "json",
					"token": api_keys.ahrefs
				},
				endpoint = "https://apiv2.ahrefs.com?" + Object.keys(options).map(function(k) {
					return k + '=' + options[k];
				}).join('&'),
				r = request(endpoint)
			return r.hasOwnProperty("domain") ? r.domain.domain_rating : r;

		}
	}
	return endpoints[platform](url)
}

var getShares = function(getBlank) {
	var isEmpty = function(v) {
		return v == '' && v != '0'
	}

	var searchTitle = function(t) {
		var r = SpreadsheetApp.getActiveSheet().getDataRange().getValues()[0].reduce(function(a, v, i) {
			v === t ? a.push(i) : a;
			return a;
		}, [])
		return r.length > 0 ? r[0] : false;
	}

	var setCell = function(r, c, v) {
		SpreadsheetApp.getActiveSheet().setActiveRange(SpreadsheetApp.getActiveSheet().getRange(parseInt(r) + 1, parseInt(c) + 1)).setValue(v);
	}

	getBlank = typeof getBlank === 'undefined' ? false : getBlank
	var url_index = searchTitle('Story Link'),
		index = {
			"facebook": searchTitle('Facebook Shares'),
			"twitter": searchTitle('Twitter Shares'),
			"ahrefs": searchTitle('Domain Rank'),
		}

	SpreadsheetApp.getActiveSheet().getDataRange().getValues().forEach(function(r, i) {
		if (i > 0 && r[url_index] != '') {
			var totals = 0;
			for (s in index) {
				var v = r[index[s]];
				if ((getBlank && isEmpty(v)) || (!getBlank)) {
					r[index[s]] = getApi(r[url_index], s);
					setCell(i, index[s], r[index[s]]);
				}
				totals += s != "ahrefs" && !isEmpty(v) ? parseInt(r[index[s]]) : 0;
			}
			setCell(i, searchTitle('Total Shares'), totals);
		}
	});
}