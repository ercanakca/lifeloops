'use strict'
const User = use('App/Models/User')
const DefaultEnvironment = use('App/Models/DefaultEnvironment')
const UserEnvironment = use('App/Models/UserEnvironment')
const UserPlace = use('App/Models/UserPlace')
const UserEnvironmentalInvitationCard = use('App/Models/UserEnvironmentalInvitationCard')
const UserEnvironmentalMemberList = use('App/Models/UserEnvironmentalMemberList')
const DefaultPermission = use('App/Models/DefaultPermission')
const UserPermissionList = use('App/Models/UserPermissionList')

const {validate} = use('Validator')
const Helpers = use('Helpers')

const Chat = use('App/Models/Chat')
const Message = use('App/Models/Message')
const MessageDetail = use('App/Models/MessageDetail')
const MessageSeed = use('App/Models/MessageSeed')

const LatestGeoInformation = use('App/Models/LatestGeoInformations')

//const OneSignal = require('onesignal-node');
//var https = require('https');

class ApiController {

    constructor() {
        this.oneSignalAppId = "5f8517bd-16a5-4064-80d8-8d2ea6f0653b";
    }

    /*Kayıt işlemi;
    * Çevreye üye ekleme işlemlerinde telefon numarası sistemde kayıtlı ise;
    * user_environmental_member_lists  is_type = 0
    * Değil ise; is_type = 1 yeni kullanıcı ve doğrulama kodu üzerinden kayıt olur.
    */
    async register({request, auth, response}) {

        const rules = {
            email: 'required|unique:users,email',
            language_code: 'required'
        }

        const validation = await validate(request.all(), rules)

        if (validation.fails()) {
            return response.json({
                status: false,
                data: '',
                message: 'Telefon numarası daha önce kayıt edilmiş / dil kodu yok!.'
            })
        }

        let user = await User.create(request.all())

        let token = await auth.authenticator('jwt').attempt(request.input('email'), request.input('password'))

        let lang;

        if (request.input('language_code') == 'tr')
            lang = 1
        else
            lang = 2

        if (token) {
            this.defaultEnvironmentCreate(lang, user.id)
        }

        Object.assign(user, token)

        return response.json({status: true, data: user, message: 'ok!'})

    }

    /*Login işlemi*/
    async login({request, auth, response}) {

        // İki farklı unique id kullanılırsa son giriş yapılan cihaz kullanılabilir olmalıdır.
        // Bir önceki unique id'li cihaz artık kullanılmamalıdır.
        // Bunun için bir çözüm geliştirilmeli.

        let is_change
        let is_change_msg

        let {email, password, device_unique_id} = request.all()

        try {

            if (await auth.attempt(email, password)) {

                let user = await User.findBy('email', email)

                if (user.device_unique_id != request.input('device_unique_id')) {
                    is_change = true
                    is_change_msg = 'Unique Id değişmiş!'

                    Object.assign(user, await auth.generate(user))

                } else {
                    is_change = false
                    is_change_msg = 'Unique Id değişmemiş!'

                    let token = await auth.generate(user)
                    Object.assign(user, token)

                }

                Object.assign(user, {is_changed: is_change, is_change_msg: is_change_msg})

                return response.json({status: true, data: user, message: 'ok!'})

            }

        } catch (e) {
            return response.json({status: false, data: '', message: 'You are not registered!' + e})
        }
    }

    /*Profil Güncelleme*/
    async profileUpdate({request, auth, response}) {

        let name = request.input('name')
        let region = request.input('region_code')
        let language = request.input('language_code')
        let country = request.input('country_code')
        let notification_token = request.input('notification_token')

        await auth.check()
        const user = await auth.getUser()
        const userId = user.id

        let original = ''
        let thumbnail = ''


        if (request.file('avatar') !== null && request.file('avatar').size !== null) {

            const fileName = user.id + ".jpg"

            const profilePic = request.file('avatar', {
                types: ['image', 'octet-stream'],
                size: '5mb'
            })

            await profilePic.move(Helpers.publicPath('user/original/'), {
                name: fileName,
                overwrite: true
            })

            if (!profilePic.moved()) {
                return response.json({status: false, data: '', message: profilePic.error().message})
            } else {
                original = fileName
                thumbnail = fileName
            }

        } else {
            const detail = await User.find(userId)
            original = detail.original
            thumbnail = detail.thumbnail
        }

        try {

            await User
                .query()
                .where('id', userId)
                .update({
                    name: name,
                    region_code: region,
                    language_code: language,
                    country_code: country,
                    original: original,
                    thumbnail: thumbnail,
                    notification_token: notification_token
                })

            const userDetail = await User.find(userId)

            return response.json({
                status: true,
                data:
                    {
                        email: userDetail.email,
                        name: userDetail.name,
                        region_code: userDetail.region,
                        language_code: userDetail.language_code,
                        country_code: userDetail.country_code,
                        original: 'http://socket.findly-app.com:4444/user/original/' + userDetail.original,
                        thumbnail: 'http://socket.findly-app.com:4444/user/original/' + userDetail.original,
                        notification_token: userDetail.notification_token
                    },
                message: 'ok!'
            })

        } catch (e) {
            return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
        }

    }

    /*Öntanımlı Dil'e bağlı çevre oluşturma*/
    async defaultEnvironmentCreate(languageId, userId) {

        const environments = await DefaultEnvironment.query().where('language_id', '=', languageId).fetch()

        for (let i = 0; i < environments.rows.length; i++) {
            await UserEnvironment.create({user_id: userId, name: environments.rows[i].name, status: 1})
        }

    }

    /*Kullanıcı çevre oluşturma*/
    async userEnvironmentCreate({request, auth, response}) {

        const rules = {name: 'required'}

        const validation = await validate(request.all(), rules)

        if (validation.fails()) {
            return response.json({status: false, data: '', message: 'Çevre adı gereklidir!.'})
        } else {

            await auth.check()
            const user = await auth.getUser()

            const info = await UserEnvironment.query().where('user_id', user.id).where('name', request.input('name')).first()

            if (info == null || info == false) {
                await UserEnvironment.create({user_id: user.id, name: request.input('name'), status: 1})
                return response.json({status: true, data: '', message: 'Başarılı!.'})
            } else {
                return response.json({status: false, data: '', message: 'Aynı isimde bir çevre kaydınız var!.'})
            }

        }

    }

    /*Kullanıcı yer oluşturma*/
    async placeCreate({request, auth, response}) {

        let environment_id;
        let address;

        const rules = {
            name: 'required',
            latitute: 'required',
            longitude: 'required',
        }

        const validation = await validate(request.all(), rules)

        if (validation.fails()) {
            return response.json({status: false, data: '', message: 'Değerleri kontrol ediniz.'}) // validation.messages()
        } else {

            if (request.input('environment_id') != "undefined" || request.input('environment_id') != null)
                environment_id = request.input('environment_id')
            else
                environment_id = ''

            if (request.input('address') != "undefined" || request.input('address') != null)
                address = request.input('address')
            else
                address = ''

            try {

                await auth.check()
                const user = await auth.getUser()

                const check = await UserPlace
                    .query()
                    .where('name', '=', request.input('name'))
                    .where('user_id', '=', user.id)
                    .getCount()

                if (check == 0) {

                    const result = await UserPlace.create({
                        user_id: user.id,
                        name: request.input('name'),
                        latitute: request.input('latitute'),
                        longitude: request.input('longitude'),
                        environment_id: request.input('environment_id'),
                        address: request.input('address'),
                        status: 1,
                    })

                    return response.json({status: true, data: '', message: 'ok!'})

                } else {
                    return response.json({status: false, data: '', message: 'Daha önce kayıt edilmiş!'})
                }

            } catch (e) {
                return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
            }

        }

    }

    /*Kullanıcı yer güncelleme*/
    async placeUpdate({request, auth, response}) {

        const rules = {
            name: 'required',
            latitute: 'required',
            longitude: 'required',
        }

        const validation = await validate(request.all(), rules)

        if (validation.fails()) {
            return response.json({status: false, data: '', message: 'Değerleri kontrol ediniz.'})
        } else {

            try {

                await auth.check()
                const user = await auth.getUser()

                const check = await UserPlace
                    .query()
                    .where('name', '=', request.input('name'))
                    .where('user_id', '=', user.id)
                    .where('id', '!=', request.params.id)
                    .getCount()

                if (check == 0) {

                    await UserPlace
                        .query()
                        .where('id', request.params.id)
                        .update({
                            name: request.input('name'),
                            latitute: request.input('latitute'),
                            longitude: request.input('longitude'),
                            address: request.input('address'),
                            environment_id: request.input('environment_id')
                        })

                    return response.json({status: true, data: '', message: 'ok!'})
                } else {
                    return response.json({status: false, data: '', message: 'Aynı isimde bir yeriniz daha var!'})
                }

            } catch (e) {
                return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
            }

        }

    }

    /*Kullanıcı yer silme*/
    async placeDelete({request, auth, response}) {

        try {

            const place = await UserPlace.find(request.params.id)

            await place.delete()

            return response.json({status: true, data: '', message: 'ok!'})

        } catch (e) {
            return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
        }

    }

    /*Kullanıcı yer listesi*/
    async placeList({request, auth, response}) {

        try {

            await auth.check()
            const user = await auth.getUser()

            const places = await UserPlace.query().where('user_id', user.id).where('status', 1).fetch()
            return response.json({status: true, data: places, message: 'ok!'})

        } catch (e) {

            return response.json({status: false, data: '', message: 'CatchError! ' + e.message})

        }

    }

    /*Kullanıcı çevre listesi*/
    async userEnvironmentList({request, auth, response}) {

        const formattingData = []

        
        try {

            await auth.check()
            const user = await auth.getUser()

            const userEnvironmentList = await UserEnvironment.query().where('user_id', user.id).where('status', 1).fetch()

            if (userEnvironmentList.rows.length > 0) {

                for (let i = 0; i < userEnvironmentList.rows.length; i++) {

                    formattingData.push ({
                        id: userEnvironmentList.rows[i].id,
                        user_id: userEnvironmentList.rows[i].user_id,
                        name: userEnvironmentList.rows[i].name,
                        content: userEnvironmentList.rows[i].content,
                        status: userEnvironmentList.rows[i].status,
                        is_owner: true,
                        table: 'user_environments'
                    })

                }

            }

            const addedUserEnvironmentList = await UserEnvironmentalMemberList.query().where('user_id', user.id).where('status', 1).fetch()

            if (addedUserEnvironmentList.rows.length > 0) {

                for (let i = 0; i < addedUserEnvironmentList.rows.length; i++) {

                   const getEnvironmentDetail = await UserEnvironment.query().where('id', addedUserEnvironmentList.rows[i].user_environment_detail_id).first()

                    formattingData.push ({
                        id: addedUserEnvironmentList.rows[i].id,
                        user_id: addedUserEnvironmentList.rows[i].user_id,
                        name: getEnvironmentDetail.name,
                        content: getEnvironmentDetail.content,
                        status: addedUserEnvironmentList.rows[i].status,
                        is_owner: false,
                        table: 'user_environmental_member_lists'
                    })

                }

            }

            return response.json({status: true, data: formattingData, message: 'ok!'})

        } catch (e) {
            return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
        }

    }

    /*Kullanıcı çevre silme*/
    async userEnvironmentDelete({request, auth, response}) {

        try {

            const environment = await UserEnvironment.find(request.params.id)

            await environment.delete()

            return response.json({status: true, data: '', message: 'ok!'})

        } catch (e) {
            return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
        }

    }

    /*Kullanıcı çevreye üye ekleme*/
    async addUserEnvironment({request, auth, response}) {

        //numara varsa onay bildirimi atılacak.
        //numara hiç kayıtlı değilse kod doğrulama yapılacak.

        const user = await auth.getUser()

        const rules = {environment_id: 'required', email: 'required'}

        const validation = await validate(request.all(), rules)

        if (validation.fails()) {
            return response.json({
                status: false,
                data: '',
                message: 'Telefon numarası / çevre id yok!'
            })
        }

        const noSelf = await User
            .query()
            .where('id', '=', user.id)
            .where('email', '=', request.input('email'))
            .where('status', '=', 1)
            .getCount()

        if (noSelf) {
            return response.json({status: false, data: '', message: 'Kendinizi ekleyemezsiniz!'})
        } else {

            const added = await User
                .query()
                .where('email', '=', request.input('email'))
                .where('status', '=', 1)
                .first()

            if (added) {

                const beforeAddedCheck = await
                    UserEnvironmentalMemberList.query()
                        .where('owner_id', user.id).whereIn('status', [0,1]).where('user_id', added.id)
                        .where('user_environment_detail_id', request.input('environment_id'))
                        .first()

                if (!beforeAddedCheck){

                    try {

                        await UserEnvironmentalMemberList.create({
                            owner_id: user.id,
                            user_id: added.id,
                            user_environment_detail_id: request.input('environment_id'),
                            is_type: 0,
                            is_verify: 0,
                            status: 0
                        })

                        //Onaylama bildirimi gönder
                        const ownerDetail = await User.query().where('id', user.id).first()
                        const addedDetail = await User.query().where('id', added.id).first()

                        let text_tr = ownerDetail.name + ', seni çevresine ekledi. Onaylamalısınız!'
                        let text_en = ownerDetail.name + ', added you around. You must confirm!'

                        let getConfig = new ApiController();

                        if (addedDetail.notification_token != null) {

                            let message = {
                                app_id: getConfig.oneSignalAppId,
                                contents: {"en": text_en, "tr": text_tr},
                                data: {'type': 'invitation'},
                                include_player_ids: [addedDetail.notification_token]
                            }

                            await this.sendNotification(message)

                        }

                        return response.json({
                            status: true,
                            data: '',
                            message: 'Başarılı! Eklenen kişinin onaylaması gerekiyor.'
                        })

                    } catch (e) {
                        return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
                    }

                }else{
                    return response.json({status: false, data: '', message: 'Daha önce davet isteği gönderilmiş / zaten çevrenizde ekli!'})
                }

            } else {
                await this.userEnvironmentalInvitationCard({request, auth, response})
            }

        }

    }

    /* Kullanıcı uygulamada olmayan birini davet ederse davet kodu kullanılır. is_type = 0'dır.
    *  Kullanıcı uygulamada olan birini davet ederse, bildirim ile bilgilendirilir, onay vermesi sağlanır. is_type = 1'dir. */
    async userEnvironmentalInvitationCard({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()

        var newcode;

        const calcDate = await this.dateCreate()

        const isThere = await UserEnvironmentalInvitationCard
            .query()
            .where('begin_date', '>=', calcDate.begin)
            .where('end_date', '<=', calcDate.end)
            .where('user_id', '=', user.id)
            .where('status', '=', 1)
            .getCount()

        if (isThere == 0 || isThere < 0) {

            const createCode = await this.generateRandomString(6, user.id)

            newcode = createCode

            try {

                await UserEnvironmentalInvitationCard.create({
                    code: newcode,
                    user_id: user.id,
                    user_environment_id: request.input('environment_id'),
                    begin_date: calcDate.begin,
                    end_date: calcDate.end,
                    status: 1
                })

            } catch (e) {
                return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
            }

        } else if (isThere == 1) {

            const detail = await UserEnvironmentalInvitationCard
                .query()
                .where('user_id', '=', user.id)
                .where('status', '=', 1)
                .first()

            newcode = await detail.code

        }

        return response.json({
            status: true,
            data: '',
            code: newcode,
            message: 'Başarılı! Eklenen kişinin onaylaması gerekiyor..'
        })

    }

    /*Rastgele davetiye kodu oluşturma*/
    async generateRandomString(length, id) {

        var result = ''
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        var charactersLength = characters.length;
        var newcode = ''

        for (var i = 0; i < 6; i++) {
            if (i == 3) result += '-'
            newcode += characters.charAt(Math.floor(Math.random() * charactersLength))
        }

        return await newcode;

    }

    /*Davetiye kodu onaylama*/
    async invitationVerify({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()

        let languageId

        if (user.language_code == 'tr')
            languageId = 1
        else
            languageId = 2

        const calcDate = await this.dateCreate()

        if (request.input('code') != null && request.input('code') != 'undefined') {

            const info = await UserEnvironmentalInvitationCard.query().where('code', request.input('code')).where('begin_date', '>=', calcDate.begin).where('end_date', '<=', calcDate.end).where('status', 1).first()

            if (info) {

                const addedCheck = await UserEnvironmentalMemberList.query().where('user_id', user.id).where('owner_id', info.user_id).where('status', 1).first()

                if (addedCheck) {
                    return response.json({status: false, data: '', message: 'Çevreye zaten eklenmişsiniz!'})
                } else {

                    await UserEnvironmentalMemberList.create({
                        owner_id: info.user_id,
                        user_id: user.id,
                        user_environment_detail_id: info.user_environment_id,
                        is_verify: 1,
                        is_type: 1,
                        status: 1
                    })

                    await UserEnvironment
                        .query()
                        .where('user_id', user.id)
                        .update({
                            status:2
                        })

                    this.permissionCreate(user.id, languageId)

                    return response.json({status: true, data: '', message: 'Çevreye eklendiniz!.'})
                }

            } else {
                return response.json({status: false, data: '', message: 'Geçersiz doğrulama kodu!.'})
            }

        } else if (request.input('id') != null && request.input('id') != 'undefined') {

            const memberUpdate = await UserEnvironmentalMemberList.query().where('id', request.input('id')).where('user_id', user.id).where('status', 0).first()

            if (memberUpdate) {

                try {

                    await UserEnvironmentalMemberList
                        .query()
                        .where('id', memberUpdate.id)
                        .update({is_verify: 1, status: 1})

                    await UserEnvironment
                        .query()
                        .where('user_id', user.id)
                        .update({status: 2})

                    this.permissionCreate(user.id, languageId)

                    return response.json({status: true, data: '', message: 'Çevreye eklendiniz!'})

                } catch (e) {
                    return response.json({status: false, data: '', message: 'CatchError! ' + e.message})

                }

            } else {
                return response.json({status: false, data: '', message: 'Geçersiz doğrulama işlemi!.'})
            }

        }

    }

    /*Tarih oluşturma*/
    async dateCreate() {

        var today = new Date()
        var dd = String(today.getDate()).padStart(2, '0')
        var mm = String(today.getMonth() + 1).padStart(2, '0')
        var yyyy = today.getFullYear()

        var begin = yyyy + '-' + mm + '-' + dd + ' 00:00:00'
        var end = new Date(begin)
        end.setDate(end.getDate() + 7)

        var dd2 = String(end.getDate()).padStart(2, '0')
        var mm2 = String(end.getMonth() + 1).padStart(2, '0')
        var yyyy2 = end.getFullYear()

        var end = yyyy2 + '-' + mm2 + '-' + dd2 + ' 00:00:00'

        return ({begin: begin, end: end})

    }

    /*İzin oluşturma*/
    async permissionCreate(userId, languageId) {

        const data = await DefaultPermission.query().where('language_id', languageId).where('status', 1).fetch()

        try {

            for (let t = 0; t < data.rows.length; t++) {

                const check = await UserPermissionList.query().where('default_permission_id', data.rows[t].id).where('user_id', userId).first()

                if(!check){
                    await UserPermissionList.create({default_permission_id: data.rows[t].id, user_id: userId, is_value: 1})
                }

            }

        } catch (e) {
            return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
        }

    }

    /*Kullanıcı çevreleri*/
    async userEnvironments({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()

        const environments = await UserEnvironment.query().where('user_id', '=', user.id).where('status', 1).fetch()

        let data = []

        if (environments.rows.length == 0) {

            const addedEnvironments = await UserEnvironmentalMemberList.query().where('user_id', user.id).where('status', 1).fetch()

            for (let k = 0; k < addedEnvironments.rows.length; k++) {

                data.push({
                    'id': addedEnvironments.rows[k].user_environment_detail_id,
                    'name': await this.environmentDetail(addedEnvironments.rows[k].user_environment_detail_id),
                    'owner': await this.ownerFind(addedEnvironments.rows[k].user_environment_detail_id),
                    'member': await this.addedMemberGet(addedEnvironments.rows[k].user_environment_detail_id),

                })

            }

        } else {

            for (let i = 0; i < environments.rows.length; i++) {

                data.push({
                    'id': environments.rows[i].id,
                    'name': environments.rows[i].name,
                    'owner': await this.ownerFind(environments.rows[i].id),
                    'member': await this.memberGet(environments.rows[i].id),
                })

            }

        }

        return response.json({status: '???', data: data, message: 'ok!'})

    }

    /*Kullanıcı çevrelerindeki kullanıcı listesi*/
    async memberGet(environmentId) {

        const reData = {status: false, item: []}

        const member = await UserEnvironmentalMemberList.query().where('user_environment_detail_id', environmentId).where('status', 1).fetch()

        if (typeof member != null) {

            for (var k = 0; k < member.rows.length; k++) {

                const detail = await User.query().where('id', member.rows[k].user_id).first()

                if (detail) {
                    reData['status'] = true
                    reData['item'][k] = {
                        id: member.rows[k].user_id,
                        name: detail.name,
                        permission: await this.permissionDetail(member.rows[k].user_id),
                        latest:  await this.latestGeoDetail(member.rows[k].user_id)
                    }
                }

            }

        }

        return await reData

    }

    /*Kullanıcı çevrelerindeki üyeler*/
    async addedMemberGet(environmentId) {

        var k = 0

        const reData = {status: false, item: []}

        const member = await UserEnvironmentalMemberList.query().where('user_environment_detail_id', environmentId).where('status', 1).fetch()

        if (typeof member != null) {

            for (k = 0; k < member.rows.length; k++) {

                const detail = await User.query().where('id', member.rows[k].user_id).first()

                if (detail) {
                    reData['status'] = true
                    reData['item'][k] = {
                        id: member.rows[k].user_id,
                        name: detail.name,
                        permission: await this.permissionDetail(member.rows[k].user_id),
                        latest2:  await this.latestGeoDetail(member.rows[k].user_id)
                    }
                }

            }

        }

        return await reData

    }

    /*Çevre kurucu kullanıcıyı bulma*/
    async ownerFind(environmentId) {

        const ownerMemberLearn = await UserEnvironment.query().where('id', environmentId).where('status', 1).first()

        const ownerMember = await User.query().where('id', ownerMemberLearn.user_id).where('status', 1).first()

        return await {
            id: ownerMember.id,
            name: ownerMember.name,
            latest: await this.latestGeoDetail(ownerMember.id),
        }

    }

    /*Çevre detaylı bilgi*/
    async environmentDetail(id) {

        const detail = await UserEnvironment.query().where('id', id).where('status', 1).first()

        return detail.name


    }

    /*İzin detaylı bilgi*/
    async permissionDetail(userId) {

        const reData = {status: false, item: []}

        const permission = await UserPermissionList.query().select('id', 'default_permission_id', 'is_value').where('user_id', userId).fetch();

        if (typeof permission != null) {

            for (var k = 0; k < permission.rows.length; k++) {

                const detail = await DefaultPermission.query().where('id', permission.rows[k].default_permission_id).first()

                if (detail) {
                    reData['item'][k] = {
                        id: permission.rows[k].id,
                        name: detail.name,
                        is_value: permission.rows[k].is_value == '1' ? true : false
                    }
                }

            }

        }

        return await reData

    }

    /*is_type = 0 olan kullanıcıların onaylamadığı istekleri listeleme*/
    async userNonAproved({request, auth, response}) {

        //is_type = 0 doğrulama kodu olmadan yapılan işlem.
        //is_type = 1 doğrulama kodu üzerinden yapılan işlem.

        await auth.check()
        const user = await auth.getUser()

        const nonApproved = await UserEnvironmentalMemberList.query().select('id').where('user_id', '=', user.id).where('is_verify', '=', 0).where('status', '=', 0).where('is_type', '=', 0).fetch()

        if (nonApproved.rows.length > 0)
            return response.json({status: true, data: nonApproved, message: 'ok!'})
        else
            return response.json({status: false, data: '', message: 'Onaylanacak istek yok!'})

    }

    /*is_type = 0 olan kullanıcıların onaylaması işlemi*/
    async userApprove({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()

        let text_tr = ''
        let text_en = ''

        const approveOrLeaveCheck = await UserEnvironmentalMemberList.query().where('id', request.input('id')).where('is_verify', request.input('is_verify')).first()

        if (approveOrLeaveCheck){
            return response.json({status: false, data: '', message: 'Çevreden Onay/Ayrılma işlemi zaten yapılmış!'})
        }

        const dataUpdate = await UserEnvironmentalMemberList
            .query()
            .where('id', request.input('id'))
            .where('user_id', user.id)
            .update({
                is_verify: request.input('is_verify'),
                status: 1
            })

        if (dataUpdate) {

            await UserEnvironment
                .query()
                .where('user_id', user.id)
                .update({status: 2})

            const info = await User.query().where('id', user.id).first()

            let language_code = info.language_code == 'tr' ? '1' : '2'

            this.permissionCreate(user.id, language_code)

            const getOwner = await UserEnvironmentalMemberList.query().where('id', request.input('id')).first()

            const ownerDetail = await User.query().where('id', getOwner.owner_id).first()
            const addedDetail = await User.query().where('id', user.id).first()

            if(request.input('is_verify') == '1'){
                text_tr = addedDetail.name + ', isteğinizi onayladı'
                text_en = addedDetail.name + ', approved your request!'
            }else if(request.input('is_verify') == '2'){
                text_tr = addedDetail.name + ', çevrenizden ayrıldı.'
                text_en = addedDetail.name + ', has left you.'
            }

            let getConfig = new ApiController();

            if (ownerDetail.notification_token != null) {

                let message = {
                    app_id: getConfig.oneSignalAppId,
                    contents: {"en": text_en, "tr": text_tr},
                    data: {'type': 'approve'},
                    include_player_ids: [ownerDetail.notification_token]
                }

                await this.sendNotification(message)

            }

            return response.json({status: true, data: '', message: 'ok!'})

        } else {
            return response.json({status: false, data: '', message: 'Onaylanama işlemi başarısız!'})
        }

    }

    /*Kullanıcı paket, abonelik satın-alım*/
    async purchaseStore({request, auth, response}) {

        try {

            await auth.check()
            const user = await auth.getUser()

            await User
                .query()
                .where('id', user.id)
                .update({is_premium: request.input('is_premium')})

            return response.json({status: true, data: '', message: 'Başarılı! Premium durumu güncellendi'})

        } catch (e) {
            return response.json({status: false, data: '', message: 'CatchError! ' + e.message})
        }

    }

    /*Kullanıcı sözleşmeleri*/
    async appContract({request, auth, response}) {

        return response.json({
            status: true,
            data: {
                'support': 'https://sites.google.com/view/xxx/support',
                'privacy': 'https://sites.google.com/view/xxx/privacy',
                'eula': 'https://sites.google.com/view/xxx/eula',
            },
            message: 'ok!'
        })

    }

    /*Chat oluşturma*/
    async chatCreate({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()
        const userId = user.id

        try {

            if (user.id != request.input('to_user_id')) {

                const check = await Chat
                    .query()
                    .where('created_user_id', user.id)
                    .where('to_user_id', request.input('to_user_id'))
                    .getCount()


                if (check == 0) {

                    const createChat = await Chat.create({
                        created_user_id: userId,
                        to_user_id: request.input('to_user_id'),
                        status: 1
                    })

                    if (createChat) {

                        const detail1 = await Chat.query()
                            .where('created_user_id', userId)
                            .where('to_user_id', request.input('to_user_id'))
                            .first()

                        return response.json({
                            'status': true,
                            'result': {
                                'chat_id': detail1.id,
                                'user_id': detail1.created_user_id,
                                'to_user_id': detail1.to_user_id
                            },
                            'message': 'inserted ok!'
                        })
                    }

                } else {

                    const detail2 = await Chat.query()
                        .where('created_user_id', user.id)
                        .where('to_user_id', request.input('to_user_id'))
                        .first()

                    return response.json({
                        'status': true,
                        'result': {
                            'chat_id': detail2.id,
                            'user_id': detail2.created_user_id,
                            'to_user_id': detail2.to_user_id
                        },
                        'message': 'selected ok!'
                    })

                }

            } else {
                return response.json({'status': false, 'result': {}, 'message': 'Error!'})
            }

        } catch (e) {
            return response.json({'status': false, 'result': {}, 'message': 'CatchError! ' + e.message})
        }

    }

    /*Mesaj gönderme*/
    async messageSend({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()
        const userId = user.id

        try {

            let receiver = await Chat.query().where('id', request.input('chat_id')).first()

            let receiverFinded = (userId == receiver.created_user_id) ? receiver.to_user_id : receiver.created_user_id

            const insertResult = await this.addMessage({
                chat_id: request.input('chat_id'),
                sender: userId,
                receiver: receiverFinded,
                data_type: request.input('data_type'),
                content: request.input('content'),
                latitude: request.input('latitude'),
                longitude: request.input('longitude')
            })

            if (insertResult.status == true) {
                return response.json({
                    status: true,
                    result: {
                        chat_id: parseInt(request.input('chat_id')),
                        sender: userId,
                        receiver: receiverFinded,
                        data_type: request.input('data_type'),
                        content: request.input('content'),
                        latitude: request.input('latitude'),
                        longitude: request.input('longitude')
                    },
                    'message': insertResult.message
                })
            } else {
                return response.json({'status': false, 'result': {}, 'message': insertResult.message})
            }

        } catch (e) {
            return response.json({'status': false, 'result': {}, 'message': 'CatchError! ' + e.message})
        }

    }

    /*Mesaj gönderme; yardımcı fonksiyon*/
    async addMessage(data = {}) {

        try {

            const result = await Message.create({
                chat_id: data.chat_id,
                data_type: data.data_type,
                sender: data.sender,
                receiver: data.receiver,
                status: 1
            })

            if (result.id > 0) {

                const detailResult = await MessageDetail.create({
                    message_id: result.id,
                    content: data.content,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    status: 1
                })

                if (detailResult.id > 0) {

                    const seedResult = await MessageSeed.create({
                        message_id: result.id,
                        required_user_id: data.receiver
                    })

                    if (seedResult.id > 0) {


                        const senderDetail = await User.query().where('id', data.sender).first()
                        const receiverDetail = await User.query().where('id', data.receiver).first()

                        let text_tr = senderDetail.name + ', sana mesaj gönderdi!'
                        let text_en = senderDetail.name + ', has sent you a message!'

                        let getConfig = new ApiController();

                        if (receiverDetail.notification_token != null) {

                            let message = {
                                app_id: getConfig.oneSignalAppId,
                                contents: {"en": text_en, "tr": text_tr},
                                data: {'type': 'message'},
                                include_player_ids: [receiverDetail.notification_token]
                            }

                            await this.sendNotification(message)

                        }

                        return {
                            status: true,
                            result: {
                                chat_id: data.chat_id,
                                data_type: data.data_type,
                                receiver: data.receiver,
                                sender: data.sender,
                                content: data.content,
                                latitude: data.latitude,
                                longitude: data.longitude,
                            }, message: 'Message saved! '
                        }

                    } else {
                        return {status: false, result: {}, message: 'AddMessageErrorPeer3! '}
                    }

                } else {
                    return {status: false, result: {}, message: 'AddMessageErrorPeer2! '}
                }

            } else {
                return {status: false, result: {}, message: 'AddMessageErrorPeer1! '}
            }

        } catch (e) {
            return {status: false, result: {}, message: 'AddMessageCatchError! ' + e.message}
        }

    }

    /*Kullanıcı, çevresinde bulunan üyelere acil durum isteği gönderme*/
    async emergency({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()

        let latitude = request.input('latitude');
        let longitude = request.input('longitude');

        try {

            const finded = []
            const noficationUserIds = []
            const sendUserTokens = []

            const userFindEnvironmet = await UserEnvironmentalMemberList.query().where('user_id', user.id).fetch()

            if (userFindEnvironmet) {

                for (let i = 0; i < userFindEnvironmet.rows.length; i++) {
                    finded.push(userFindEnvironmet.rows[i].user_environment_detail_id)
                }

                const findedOK = await UserEnvironmentalMemberList
                    .query()
                    .where('user_id', '!=', user.id)
                    .whereIn('user_environment_detail_id', finded)
                    .fetch()

                for (let j = 0; j < findedOK.rows.length; j++) {
                    noficationUserIds.push(findedOK.rows[j].user_id)
                }

                const users = await User.query().select('notification_token').whereIn('id', noficationUserIds)/*.where('notification_token', '!=', null)*/.where('status', 1).fetch()

                if (users) {

                    for (let i = 0; i < users.rows.length; i++) {
                        sendUserTokens.push(users.rows[i].notification_token)
                    }

                    let text_tr = ''
                    let text_en = ''

                    const userDetail = await User.query().where('id', user.id).first()

                    text_tr = userDetail.name + ' senden acil durumu talep ediyor!'
                    text_en = userDetail.name + ' demands emergency from you!'

                    let getConfig = new ApiController();

                    let message = {
                        app_id: getConfig.oneSignalAppId,
                        contents: {"en": text_en, "tr": text_tr},
                        data: {'type': 'emergency', 'latitude': latitude, 'longitude': longitude},
                        include_player_ids: sendUserTokens
                    }

                    const result = await this.sendNotification(message)

                    if (result.status == true)
                        return response.json({'status': true, 'result': {}, 'message': 'Acil Durum isteği gönderildi!'})
                    else
                        return response.json({
                            'status': false,
                            'result': {},
                            'message': result.message
                        })

                }

            } else {
                return response.json({
                    'status': false,
                    'result': {},
                    'message': 'Her hangi bir çevreye eklenmediğiniz için, Acil durum isteği gönderilemedi! '
                })
            }

        } catch (e) {
            return response.json({'status': false, 'result': {}, 'message': 'CatchError! ' + e.message})
        }

    }

    /*Bildirim işlemleri;
    1- çevreye üye ekleme & ardından onaylama / ayrılma,
    2- yanıtlayıcı durumundaki kişiye mesaj gönderildi gönderme,
    3- acil durum isteği.
    */
    async sendNotification(data) {

        let options = {
            host: "onesignal.com",
            port: 443,
            path: "/api/v1/notifications",
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Basic Yzc0OGQ0ZWUtNmUzNi00YTcwLThlMTYtYzY5MTIzOWE5Yzkz"
            }
        }

        try {

            var req = https.request(options, function (res) {
                res.on('data', function (data) {
                })
            })

            req.on('error', function (e) {
                console.log(e)
            });

            req.write(JSON.stringify(data));
            req.end();

            return {'status': true, 'result': {}, 'message': 'Başarılı! '}

        } catch (e) {
            return {'status': false, 'result': {}, 'message': 'CatchError! ' + e.message}
        }

    }

    async latestGeoDetail(userId) {

        const latestDetail = await LatestGeoInformation.query().where('user_id', userId).first();

        if (latestDetail) {

            return {
                status: true,
                latitude: latestDetail.lat,
                longitude: latestDetail.lng,
                battery: latestDetail.battery,
                time: latestDetail.time,

            }

        } else {
            return {
                status: false,
                latitude: '',
                longitude: '',
                battery: '',
                time: '',

            }
        }
    }


/*
    async locationFollow({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()
        const refactoringData = []

        try {

            const environmentMemberList = await UserEnvironmentalMemberList.query().where('user_environment_detail_id', request.input('environment_id')).where('status', 1).fetch()

            if (environmentMemberList) {

                for (let k=0; k< environmentMemberList.rows.length; k++){

                    refactoringData.push({
                        environment_id: environmentMemberList.rows[k].user_environment_detail_id,
                        user_id: environmentMemberList.rows[k].user_id,
                        latitude: environmentMemberList.rows[k].last_lat,
                        longitude: environmentMemberList.rows[k].last_lng,
                        battery: environmentMemberList.rows[k].last_battery,
                        last_time: environmentMemberList.rows[k].last_time,
                    })

                }
            }

            return {
                status: true,
                result: refactoringData,
                message: 'location saved! '
            }

        } catch (e) {
            return response.json({'status': false, 'result': {}, 'message': 'CatchError! ' + e.message})
        }


    }
*/

    async lastGeoUpdate({request, auth, response}) {

        await auth.check()
        const user = await auth.getUser()

        try {

            const geoDetail = await LatestGeoInformation.query().where('user_id', user.id).where('status', 1).first()

            if(geoDetail){

                await LatestGeoInformation
                    .query()
                    .where('user_id', user.id)
                    .update({
                        lat: request.input('latitude'),
                        lng: request.input('longitude'),
                        battery: request.input('battery'),
                        time: request.input('time'),
                        status: 1
                    })

            }else{

                await LatestGeoInformation.create({
                    user_id: user.id,
                    lat: request.input('latitude'),
                    lng: request.input('longitude'),
                    battery: request.input('battery'),
                    time: request.input('time'),
                    status: 1
                })
            }

            const lastGeoDetail = await LatestGeoInformation.query().where('user_id', user.id).first()

            return response.json({
                status: true,
                result: {
                    user_id: lastGeoDetail.user_id,
                    latitude: lastGeoDetail.lat,
                    longitude: lastGeoDetail.lng,
                    battery: lastGeoDetail.battery,
                    time: lastGeoDetail.time
                },
                message: 'saved!'
            })

        } catch (e) {
            return response.json({'status': false, 'result': {}, 'message': 'CatchError! ' + e.message})
        }

    }





/*
    async regionFrom(lat, lon, distance) {
        distance = distance/2
        const circumference = 40075
        const oneDegreeOfLatitudeInMeters = 111.32 * 1000
        const angularDistance = distance/circumference

        const latitudeDelta = distance / oneDegreeOfLatitudeInMeters
        const longitudeDelta = Math.abs(Math.atan2(
            Math.sin(angularDistance)*Math.cos(lat),
            Math.cos(angularDistance) - Math.sin(lat) * Math.sin(lat)))

        return result = {
            latitude: lat,
            longitude: lon,
            latitudeDelta,
            longitudeDelta,
        }
    }
*/

}

module.exports = ApiController
