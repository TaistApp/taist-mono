    <!-- <div class="div_loading">
        <img src="/assets/images/load_image.webp" />
    </div> -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.22/css/jquery.dataTables.min.css">
    <div class="div_loading">
        <div>
            <img src="/assets/images/loading.gif" />
            <div class="loading_title"></div>
        </div>
    </div>

    <input type="file" class="file_csv" style="display:none">
    
    <div class="dlg_photo">
        <img src="" />
        <i class="fa fa-times dlg_photo_close"></i>
    </div>

    <div class="dlg" id='dlg_confirm'>
        <div class="dlg_cont tcenter">
            <i class="fa fa-question-circle mt10" style="color:#004494;font-size: 72px;"></i>
            <div class="confirm_message"></div>
            <div class="dbuttons1 flex flex_jspace">
                <div class="bt bt_white bt_ccancel">Cancel</div>
                <div class="bt bt_cconfirm">Ok</div>
            </div>
        </div>
    </div>

    <div class="dlg" id='dlg_error'>
        <div class="dlg_cont tcenter">
            <i class="fa fa-exclamation-triangle mt10" style="color:#ff4e4e;font-size: 72px;"></i>
            <div class="error_message"></div>
            <div class="dbuttons1 flex flex_jcenter">
                <div class="bt bt_eok">Ok</div>
            </div>
        </div>
    </div>

    <div class="dlg" id='dlg_success'>
        <div class="dlg_cont tcenter">
            <i class="fa fa-check-circle-o mt10" style="color:#00c4ee;font-size: 72px;"></i>
            <div class="success_message"></div>
            <div class="dbuttons1 flex flex_jcenter">
                <div class="bt bt_eok">Ok</div>
            </div>
        </div>
    </div>

    <div class="dlg" id='dlg_change'>
        <div class="dlg_cont tcenter" style="min-width: 320px;">
            <h3>Change Password</h3>
            <div class="d_input div_current_password">
                <label>Current password</label>
                <input type="password" class="form-control f_input" id="old_password" placeholder="*******">
            </div>
            <div class="d_input">
                <label>New password</label>
                <input type="password" class="form-control f_input" id="newpassword" placeholder="*******">
            </div>
            <div class="d_input">
                <label>Confirm password</label>
                <input type="password" class="form-control f_input" id="newpassword1" placeholder="*******">
            </div>
            <br/>
            <div class="error"></div>
            <div class="dbuttons1 flex flex_jspace">
                <div class="bt bt_white bt_ccancel">Cancel</div>
                <div class="bt bt_cchange">Change</div>
            </div>
        </div>
    </div>

    <div class="toast"><div></div></div>
    
    <div class="left_menu" id="menu">
        <a href="/admin" id="menu_bar" class="flex flex_acenter m10 mb24">
            <img class="logo" src="/assets/images/logo-2.png">
        </a>
        <div class="left_menu_items">
            <a href="#" id="btn-chefs" class="left_menu_item menu_item flex flex_jspace">
                <div><i class="fa fa-user-o l_menu_icon"></i> <span>Chefs</span></div>
                <div><span><i class="fa fa-chevron-right toggle-arrow"></i></span></div>
            </a>
            <ul class="sub_menu1 sub_chefs navbar navbar-collapse flex-column ms-1 list-unstyled">
                <li class="w-100">
                    <a class="left_menu_item l_menu_item_chefs" href="/admin/chefs" title="Chefs">
                        <i class="fa fa-user-o l_menu_icon"></i> <span>Chefs</span>
                    </a>
                </li>
                <li>
                    <a class="left_menu_item l_menu_item_categories" href="/admin/categories" title="Categories">
                        <i class="fa fa-list l_menu_icon"></i> <span>Categories</span>
                    </a>
                </li>
                <li>
                    <a class="left_menu_item l_menu_item_menus" href="/admin/menus" title="Menu Items">
                        <i class="fa fa-list-alt l_menu_icon"></i> <span>Menu Items</span>
                    </a>
                </li>
                <li>
                    <a class="left_menu_item l_menu_item_customizations" href="/admin/customizations" title="Customizations">
                        <i class="fa fa-sign-language l_menu_icon"></i> <span>Customizations</span>
                    </a>
                </li>
                <li>
                    <a class="left_menu_item l_menu_item_profiles" href="/admin/profiles" title="Profiles">
                        <i class="fa fa-user-secret l_menu_icon"></i> <span>Profiles</span>
                    </a>
                </li>
                <li>
                    <a class="left_menu_item l_menu_item_earnings" href="/admin/earnings" title="Earnings">
                        <i class="fa fa-money l_menu_icon"></i> <span>Earnings</span>
                    </a>
                </li>
            </ul>
            
            <!--
            <a class="left_menu_item l_menu_item_pendings" href="/admin/pendings" title="Pending chefs">
                <i class="fa fa-user-circle-o l_menu_icon"></i>
                <span>Pending chefs</span></a>
            -->
            <a class="left_menu_item l_menu_item_customers" href="/admin/customers" title="Customers">
                <i class="fa fa-user l_menu_icon"></i>
                <span>Customers</span></a>
            <a class="left_menu_item l_menu_item_zipcodes" href="/admin/zipcodes" title="Zipcodes">
                <i class="fa fa-map-pin l_menu_icon"></i>
                <span>Zipcodes</span></a>
            <!--
            <a class="left_menu_item l_menu_item_notifications" href="/admin/notifications" title="Notifications">
                <i class="fa fa-bell l_menu_icon"></i>
                <span>Notifications</span></a>
            -->
            <a class="left_menu_item l_menu_item_chats" href="/admin/chats" title="Chats">
                <i class="fa fa-comments l_menu_icon"></i>
                <span>Chats</span></a>
            <a class="left_menu_item l_menu_item_orders" href="/admin/orders" title="Orders">
                <i class="fa fa-calendar-check-o l_menu_icon"></i>
                <span>Orders</span></a>
            <!--
            <a class="left_menu_item l_menu_item_reviews" href="/admin/reviews" title="Reviews">
                <i class="fa fa-star l_menu_icon"></i>
                <span>Reviews</span></a>
            -->
            <a class="left_menu_item l_menu_item_contacts" href="/admin/contacts" title="Contacts">
                <i class="fa fa-envelope l_menu_icon"></i>
                <span>Contacts</span></a>
            <!--
            <a class="left_menu_item l_menu_item_transactions" href="/admin/transactions" title="Transactions">
                <i class="fa fa-flag l_menu_icon"></i>
                <span>Transactions</span></a>
            -->

            <a class="flex  admin_account mb16 flex_wrap">
                <img src="/assets/images/admin/Avatar.png">
                <div>
                    <div class="font_medium">ADMIN ACCOUNT</div>
                    <div class="clrgray0 fsize12">{{ $user->email ?? '' }}</div>
                </div>
                <div class="flex flex_acenter change_my_password cursorp clrblue1 w100 fsize12" style="padding-left: 8px; padding-top: 10px ;" id="{{ $user->id ?? '' }}">
                    <i class="fa fa-key mr16 fsize16"></i>
                    <span>Change password?</span>
                </div>
            </a>
            <a class="admin_logout flex flex_acenter font_medium mb8" href="/admin/logout">
                <img class="img24 mr8" src="/assets/images/admin/power_off.png">
                <span>LOG OUT</span>
            </a>
        </div>
    </div>