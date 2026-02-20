@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
   <style>
      .ticket-message-main { white-space: pre-wrap; margin-bottom: 8px; }
      .ticket-context {
         background: #f6f8fc;
         border: 1px solid #dde3ef;
         border-radius: 10px;
         padding: 8px 10px;
      }
      .ticket-context-title {
         font-size: 12px;
         font-weight: 700;
         color: #23395d;
         margin-bottom: 6px;
         text-transform: uppercase;
         letter-spacing: 0.04em;
      }
      .ticket-context-row {
         display: grid;
         grid-template-columns: 130px 1fr;
         gap: 8px;
         align-items: start;
         padding: 2px 0;
      }
      .ticket-context-key {
         color: #4b5565;
         font-size: 12px;
         font-weight: 600;
      }
      .ticket-context-value {
         color: #111827;
         font-size: 12px;
         word-break: break-word;
      }
      .ticket-context-link {
         color: #005ac1;
         text-decoration: none;
      }
      .ticket-context-link:hover {
         text-decoration: underline;
      }
   </style>
	<div class="admin_wrapper">
      <div class="fsize24 font_bold mb24">Contacts</div>
      <div class="div_table">
         <div class="flex flex_acenter mb10">
            <div class="fsize18 font_bold">Change Selected Tickets Status:</div>
            <button class="bt_status color color2" data-status="1">In Review</button>
            <button class="bt_status color color3" data-status="2">Resolved</button>
         </div>
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Contact ID</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Created at</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($contacts as $a) { ?>
                  <?php
                     $rawMessage = (string)($a->message ?? '');
                     $marker = "\n---\nIssue Context:\n";
                     $markerPos = strpos($rawMessage, $marker);
                     $mainMessage = $rawMessage;
                     $context = [];

                     if ($markerPos !== false) {
                        $mainMessage = trim(substr($rawMessage, 0, $markerPos));
                        $contextText = trim(substr($rawMessage, $markerPos + strlen($marker)));
                        $contextLines = $contextText === '' ? [] : explode("\n", $contextText);
                        foreach ($contextLines as $line) {
                           $line = trim($line);
                           if ($line === '') continue;
                           $parts = explode(': ', $line, 2);
                           if (count($parts) === 2) {
                              $context[$parts[0]] = $parts[1];
                           } else {
                              $context[$line] = '';
                           }
                        }
                     }

                     $orderedKeys = [
                        'issue_type', 'origin_screen', 'current_screen', 'entry_point',
                        'platform', 'device_model', 'device_os',
                        'app_version', 'app_build', 'app_env',
                        'client_timestamp', 'screenshot_url'
                     ];
                     $displayContext = [];
                     foreach ($orderedKeys as $k) {
                        if (array_key_exists($k, $context)) {
                           $displayContext[$k] = $context[$k];
                           unset($context[$k]);
                        }
                     }
                     foreach ($context as $k => $v) {
                        $displayContext[$k] = $v;
                     }

                     $contextLabels = [
                        'issue_type' => 'Issue Type',
                        'origin_screen' => 'Opened From',
                        'current_screen' => 'Submitted On',
                        'entry_point' => 'Entry Point',
                        'platform' => 'Platform',
                        'device_model' => 'Device',
                        'device_os' => 'OS',
                        'app_version' => 'App Version',
                        'app_build' => 'Build',
                        'app_env' => 'Environment',
                        'client_timestamp' => 'Client Time',
                        'screenshot_url' => 'Screenshot',
                     ];
                  ?>
                  <tr id="<?php echo $a->id;?>">
                     <td><?php echo 'T'.sprintf('%07d', $a->id);?></td>
                     <td><?php echo $a->user_email;?></td>
                     <td><?php echo htmlspecialchars($a->subject ?? '');?></td>
                     <td style="max-width: 520px;">
                        <?php if ($mainMessage !== '') { ?>
                           <div class="ticket-message-main"><?php echo nl2br(htmlspecialchars($mainMessage));?></div>
                        <?php } ?>
                        <?php if (!empty($displayContext)) { ?>
                           <div class="ticket-context">
                              <div class="ticket-context-title">Issue Context</div>
                              <?php foreach ($displayContext as $key => $value) { ?>
                                 <div class="ticket-context-row">
                                    <div class="ticket-context-key">
                                       <?php echo htmlspecialchars($contextLabels[$key] ?? ucwords(str_replace('_', ' ', $key)));?>
                                    </div>
                                    <div class="ticket-context-value">
                                       <?php if ($key === 'screenshot_url' && $value !== '') { ?>
                                          <a
                                             class="ticket-context-link"
                                             href="<?php echo htmlspecialchars($value);?>"
                                             target="_blank"
                                             rel="noopener noreferrer"
                                          >
                                             View screenshot
                                          </a>
                                       <?php } else { ?>
                                          <?php
                                             $displayValue = $value;
                                             if ($key === 'issue_type' && $value !== '') {
                                                $displayValue = ucwords(str_replace('_', ' ', $value));
                                             }
                                          ?>
                                          <?php echo $displayValue === '' ? '-' : nl2br(htmlspecialchars($displayValue));?>
                                       <?php } ?>
                                    </div>
                                 </div>
                              <?php } ?>
                           </div>
                        <?php } ?>
                     </td>
                     <td>
                        <?php echo ($a->status==1?'In Review':($a->status==2?'Resolved':''));?>
                     </td>
                     <td><?php echo $a->created_at;?></td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script src="/assets/admin/contacts.js?r={{ time() }}"></script>
   <script>
      $('.l_menu_item_contacts').addClass('sel');
   </script>
@endsection
