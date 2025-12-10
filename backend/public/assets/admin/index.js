var oneday = 24*60*60;
var from = '';
var to = '';
var from_prev = '';
var to_prev = '';
var tab_selected = '';
$(function() {

	// Menu toggle functionality
	$('#menu_toggle').click(function(e) {
		e.preventDefault();
		$('#menu').toggleClass('expanded');
		$('.admin_wrapper').toggleClass('menu_expanded');
		// Save state to localStorage
		if ($('#menu').hasClass('expanded')) {
			localStorage.setItem('adminMenuExpanded', 'true');
		} else {
			localStorage.removeItem('adminMenuExpanded');
		}
	});

	// Restore menu state from localStorage
	if (localStorage.getItem('adminMenuExpanded') === 'true') {
		$('#menu').addClass('expanded');
		$('.admin_wrapper').addClass('menu_expanded');
	}

	$('.d_input_date .f_input').daterangepicker();

	var time = moment().toDate();
	time.setHours(0);
	time.setMinutes(0);
	time.setSeconds(0);
	time.setMilliseconds(0);
	time = moment(time).unix();
	$('.atab').click(function() {
		$(this).parent().find('.atab').removeClass('sel');
		$(this).addClass('sel');
		tab_selected = $(this).text();
		from = '';
		to = '';
		from_prev = '';
		to_prev = '';
		text = $(this).text().toLowerCase();
		if (text == 'today') {
			from = time;
			to = moment().unix();
			from_prev = time - oneday*1;
			to_prev = time-1;
		}
		if (text == 'this week') {
			from = moment().startOf('week').unix();
			to = moment().endOf('week').unix(); //from + 6*oneday;
			from_prev = moment().add(-1, 'weeks').startOf('week').unix(); //from - 7*oneday;
			to_prev = moment().add(-1, 'weeks').endOf('week').unix(); //from_prev + 6*oneday;
		}
		if (text == 'this month') {
			from = moment().startOf('month').unix();
			to   = moment().endOf('month').unix();
			from_prev = moment().add(-1, 'months').startOf('month').unix();
			to_prev   = moment().add(-1, 'months').endOf('month').unix();
		}
		if (text == 'year to date') {
			from = moment().startOf('year').unix();
			to   = moment().unix();
			from_prev = moment().add(-1, 'years').startOf('year').unix();
			to_prev   = moment().add(-1, 'years').endOf('year').unix();
		}
		if (from)
			$('.date_range').val(moment(from*1000).format('MM/DD/YYYY')+' - '+moment(to*1000).format('MM/DD/YYYY'));
		else
			$('.date_range').val('All Time');
		$('.date_range').daterangepicker('refresh');
		if (!from) $('.date_range').val('All Time');

		$('.d_input_date .f_input').on('apply.daterangepicker', function(ev, picker) {
			from = picker.startDate.unix();
			to = picker.endDate.unix();
			$('.date_range').val(moment(from*1000).format('MM/DD/YYYY')+' - '+moment(to*1000).format('MM/DD/YYYY'));
			loadData(from, to);
  	});
  	$('.d_input_date .f_input').on('hide.daterangepicker', function(ev, picker) {
      if (!from)
      	$(this).val('All Time');
  	});

		if (to) to = to + oneday-1;
		if (to_prev) to_prev = to_prev + oneday-1;
		loadData(from, to);
	})

	var timer;
 	$('.div_search1 input').keyup(function() {
 		clearTimeout(timer);
 		timer = setTimeout(() => {
      	search = $(this).val().trim().toLowerCase();
      	$('.div_table_left table tbody tr').each(function() {
           	$(this).removeClass('hidden');
       		b = false;
         	$(this).find('td').each(function() {
		        if ($(this).text().trim().toLowerCase().indexOf(search) > -1)
		           	b = true;
         	})
	       	if (!b && search)
	       		$(this).addClass('hidden');
      	})	
    }, 300)
 	})
 	$('.dlg_close').click(function() {
 		$(this).parent().parent().fadeOut()
 	})
	$('.sel_sort').change(function() {
  	sortTable($(this).val());
 	})
	
	$('.atab.sel').click();
	showDate();

	$('.download_csv').click(function() {
		if ($(this).hasClass('download_csv1')) {
			title = $(this).parent().parent().next().find('.fsize22').text();
			table = $(this).parent().parent().next().find('table');
		} else if ($(this).hasClass('download_csv2')) {
			title = $(this).parent().parent().parent().prev().text();
			table = $(this).parent().find('table');
		} else {
			title = $(this).prev().text();
			table = $(this).parent().parent().find('table');
		}

		console.log(title);
		if ($(this).hasClass('download_csv1')) {
			endpoint = $(this).attr('url');
			showLoading();
			$.getJSON('/adminapi/'+endpoint+'?api_token='+token+"&from="+from+"&to="+to, function(res) {
				hideLoading();
        $('.csv_table table thead').html(table.find('thead').html());
        $('.csv_table table tbody').html('');
        if (endpoint == 'get_membership') {
        	res.data.list.forEach((a) => {
        		$('.csv_table table tbody').append(`
        			<tr>
                <td>#`+a.id+`</td>
                <td>`+a.email+`</td>
                <td>`+(a.membership=='pro'?(a.artists+' Artist'+(a.artists>1?'s':'')):'Free')+`</td>
                <td>`+moment(a.created_at*1000).format('MMM DD YYYY')+`</td>
              </tr>
        		`);
        	})
        } else if (endpoint == 'get_transaction') {
        	res.data.list.forEach((a) => {
        		$('.csv_table table tbody').append(`
        			<tr>
                <td>#`+a.id+`</td>
                <td>`+(a.tokens>0?'Purchase':'Tip')+`</td>
                <td>`+Math.abs(a.tokens)+`</td>
                <td>`+moment(a.created_at*1000).format('MMM DD YYYY')+`</td>
              </tr>
        		`);
        	})
        } else if (endpoint == 'get_listener') {
        	res.data.list.forEach((a) => {
        		$('.csv_table table tbody').append(`
        			<tr>
                <td>#`+a.id+` - `+(a.email?a.email:a.phone)+`</td>
                <td>`+a.plays+`</td>
                <td>`+a.adds+`</td>
                <td>`+a.impressions+`</td>
              </tr>
        		`);
        	})
        } else if (endpoint == 'get_artist') {
        	res.data.list.forEach((a) => {
        		$('.csv_table table tbody').append(`
        			<tr>
                <td>#`+a.id+` - `+a.name+`</td>
                <td>`+a.plays+`</td>
                <td>`+a.adds+`</td>
                <td>`+a.impressions+`</td>
              </tr>
        		`);
        	})
        } else if (endpoint == 'get_audio') {
        	res.data.list.forEach((a) => {
        		$('.csv_table table tbody').append(`
        			<tr>
                <td>#`+a.id+` - `+a.song_title+`</td>
                <td>`+a.plays+`</td>
                <td>`+a.adds+`</td>
                <td>`+a.tokens+`</td>
              </tr>
        		`);
        	})
        }
        title = title.replace('TOP ', 'ALL ');
        table = $('.csv_table table');
        downloadCSV(title, table);
     	})
		} else {
			downloadCSV(title, table);
		}
	})
})

function downloadCSV(title, table) {
	rows = [];
	row = [];
	table.find('thead tr th').each(function() {
		row.push($(this).text());
	})
	rows.push(row);
	table.find('tbody tr').each(function() {
		if (!$(this).hasClass('hidden')) {
			row = [];
			$(this).find('td').each(function() {
				row.push($(this).text());
			})
			rows.push(row);
		}
	})
	row = [];
	table.find('tfoot tr td').each(function() {
		row.push($(this).text());
	})
	rows.push(row);
	
	let csvContent = "";
	rows.forEach(function(rowArray) {
    csvContent += rowArray.join(",").replace('#','') + "	\n";
	});
	var link = window.document.createElement("a");
	link.setAttribute("href", "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURI(csvContent));
	link.setAttribute("download", title+".csv");
	link.click();
}

function showDate() {
	$('.g_date').each(function() {
		d = $(this).attr('date');
		if (d) {
			$(this).html(moment(d*1000).format('MMM DD YYYY'));
		}
	})
}

function sortTable(idx, desc=false) {
  var table, rows, switching, i, x, y, shouldSwitch;
  table = document.getElementById("table");
  switching = true;
  /* Make a loop that will continue until
  no switching has been done: */
  while (switching) {
    // Start by saying: no switching is done:
    switching = false;
    rows = table.rows;
    /* Loop through all table rows (except the
    first, which contains table headers): */
    for (i = 1; i < (rows.length - 1); i++) {
      // Start by saying there should be no switching:
      shouldSwitch = false;
      /* Get the two elements you want to compare,
      one from current row and one from the next: */
      x = rows[i].getElementsByTagName("TD")[idx];
      y = rows[i + 1].getElementsByTagName("TD")[idx];
      // Check if the two rows should switch place:
      if (desc ) {
      	if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
	        // If so, mark as a switch and break the loop:
	        shouldSwitch = true;
	        break;
	    }
      } else {
	      if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
	        // If so, mark as a switch and break the loop:
	        shouldSwitch = true;
	        break;
	      }
	  }
    }
    if (shouldSwitch) {
      /* If a switch has been marked, make the switch
      and mark that a switch has been done: */
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}